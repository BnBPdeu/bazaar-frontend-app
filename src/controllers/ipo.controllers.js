import IPO from "../models/Ipo.models.js";
import { User } from "../models/user.models.js";
import { Shares } from "../models/share.models.js";
// Create new IPO
export const createIPO = async (req, res) => {
  try {
    const ipo = new IPO(req.body);
    await ipo.save();
    res.status(201).json(ipo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all IPOs with subscription info
export const getAllIPOs = async (req, res) => {
  try {
    const ipos = await IPO.find().sort({ createdAt: -1 }).lean();

    const enrichedIPOs = ipos.map((ipo) => {
      const totalAppliedLots = ipo.appliedUsers?.reduce(
        (sum, u) => sum + (u.lots || 0),
        0
      ) || 0;

      const subscriptionMultiple =
        ipo.totalLots > 0 ? totalAppliedLots / ipo.totalLots : 0;

      // ✅ Format: more decimals when ratio is very small
      let formattedSub;
      if (subscriptionMultiple === 0) {
        formattedSub = "0x";
      } else if (subscriptionMultiple < 0.01) {
        formattedSub = subscriptionMultiple.toFixed(4) + "x"; // show up to 4 decimals
      } else {
        formattedSub = subscriptionMultiple.toFixed(2) + "x"; // default 2 decimals
      }

      return {
        ...ipo,
        totalAppliedLots,
        overallSubscription: formattedSub,
      };
    });

    res.status(200).json(enrichedIPOs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Start IPO (make it open for bidding)
export const startIPO = async (req, res) => {
  try {
    const ipo = await IPO.findByIdAndUpdate(
      req.params.id,
      { status: "open" },
      { new: true }
    );
    res.json(ipo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Close IPO (stop new applications)
export const closeIPO = async (req, res) => {
  try {
    const ipo = await IPO.findByIdAndUpdate(
      req.params.id,
      { status: "closed" },
      { new: true }
    );
    res.json(ipo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Apply for IPO
export const applyIPO = async (req, res) => {
  try {
    const { userId, lots } = req.body;
    const ipo = await IPO.findById(req.params.id);
    const user = await User.findById(userId);

    if (!ipo || ipo.status !== "open") {
      return res.status(400).json({ error: "IPO not open" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // IPO cost per lot
    const pricePerShare = ipo.priceBand[1];
    const totalCost = lots * ipo.lotSize * pricePerShare;

    if (user.TotalBalance < totalCost) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct temporarily
    user.TotalBalance -= totalCost;
    user.blockedBalance += totalCost;
    await user.save();

    ipo.appliedUsers.push({ userId, lots });
    await ipo.save();

    // Recalculate subscription
    const totalAppliedLots = ipo.appliedUsers.reduce(
      (sum, u) => sum + u.lots,
      0
    );
    const subscription = (totalAppliedLots / ipo.totalLots).toFixed(2) + "x";

    res.json({
      message: "Applied successfully, funds blocked",
      ipo: {
        ...ipo.toObject(),
        totalAppliedLots,
        overallSubscription: subscription,
      },
      userBalance: user.TotalBalance
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ allocateIPO (auto convert IPO → Share when listed)
export const allocateIPO = async (req, res) => {
  try {
    const ipo = await IPO.findById(req.params.id).populate("appliedUsers.userId");
    if (!ipo || ipo.status !== "closed") {
      return res.status(400).json({ error: "IPO must be closed before allocation" });
    }

    let applicants = [...ipo.appliedUsers];
    let availableLots = ipo.totalLots;
    let allocations = [];

    // Random shuffle
    for (let i = applicants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [applicants[i], applicants[j]] = [applicants[j], applicants[i]];
    }

    for (let applicant of applicants) {
      if (availableLots <= 0) break;
      const user = await User.findById(applicant.userId);
      if (!user) continue;

      const pricePerShare = ipo.priceBand[1];
      const cost = applicant.lots * ipo.lotSize * pricePerShare;

      // Random allocation (50% chance)
      if (Math.random() < 0.5) {
        user.TotalBalance += cost;
        user.blockedBalance -= cost;
        await user.save();
        continue;
      }

      const grantedLots = Math.min(applicant.lots, availableLots);
      availableLots -= grantedLots;
      allocations.push({ userId: applicant.userId, lots: grantedLots });

      user.blockedBalance -= cost;

      // Add shares to user portfolio
      user.portfolio.push({
        sharename: ipo.companyName,
        symbol: ipo.symbol,
        quantity: grantedLots * ipo.lotSize,
        avgPrice: pricePerShare,
      });
      await user.save();
    }

    ipo.allocatedUsers = allocations;
    ipo.status = "allocated";

    // Generate open price
    const pricePerShare = ipo.priceBand[1];
    const randomFactor = 0.9 + Math.random() * 0.4; // 0.9x to 1.3x band
    ipo.openPrice = parseFloat((pricePerShare * randomFactor).toFixed(2));

    // 🟢 Automatically create Share entry if new
    const existed = await Shares.findOne({ shareName: ipo.companyName });
    if (!existed) {
      await Shares.create({
        shareName: ipo.companyName,
        price: ipo.openPrice,
        symbol: ipo.symbol,
        sector: ipo.sector || "Others",
        image: ipo.image || "",
      });
    }

    // Mark as listed so normal simulation picks it up
    ipo.appliedUsers = [];
    ipo.status = "listed";
    await ipo.save();

    res.json({ message: "IPO allocated & moved to market", ipo });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
// Random price movement for IPO with circuit limits
const simulateIPOPrice = (ipo) => {
  if (ipo.status !== "open") return ipo.currentPrice;

  let price = ipo.currentPrice || ipo.priceBand[0];

  // Random movement between -2% and +2%
  const changePct = (Math.random() * 4 - 2) / 100;
  let nextPrice = price + price * changePct;

  // Apply circuit limit (±10%)
  const listingPrice = ipo.listingPrice || ipo.priceBand[0];
  const upperCircuit = listingPrice * 1.10;
  const lowerCircuit = listingPrice * 0.90;

  if (nextPrice > upperCircuit) nextPrice = upperCircuit;
  if (nextPrice < lowerCircuit) nextPrice = lowerCircuit;

  return parseFloat(nextPrice.toFixed(2));
};

// 🚀 Update IPO prices periodically
export const simulateIPOPrices = async (io) => {
  try {
    const openIPOs = await IPO.find({ status: "open" });

    const updates = [];
    for (let ipo of openIPOs) {
      const newPrice = simulateIPOPrice(ipo);

      ipo.currentPrice = newPrice;
      await ipo.save();

      updates.push({
        ipoId: ipo._id,
        companyName: ipo.companyName,
        symbol: ipo.symbol,
        currentPrice: newPrice,
      });
    }

    if (updates.length > 0) {
      io.emit("ipoLivePrices", updates);
    }
  } catch (err) {
    console.error("❌ IPO price simulation error:", err);
  }
};

export const getUserAllocatedIPOs = async (req, res) => {
        try {
          const userId = req.params.userId;
      
          // Find IPOs where this user is in allocatedUsers
          const ipos = await IPO.find({ "allocatedUsers.userId": userId })
            .select("companyName openPrice allocatedUsers lotSize createdAt status")
            .lean();
      
          // Filter & enrich with only this user's allocation
          const enriched = ipos.map((ipo) => {
            const allocation = ipo.allocatedUsers.find(
              (a) => a.userId.toString() === userId
            );
      
            return {
              companyName: ipo.companyName,
              status: ipo.status,
              openPrice: ipo.openPrice,
              lotsAllocated: allocation?.lots || 0,
              sharesAllocated: (allocation?.lots || 0) * ipo.lotSize,
              createdAt: ipo.createdAt,
            };
          });
      
          res.status(200).json(enriched);
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      };

export const sellIPOShare = async (req, res) => {
  try {
    const { userId, shareName, quantity } = req.body;

    const user = await User.findById(userId);
    const share = await Shares.findOne({ shareName });

    if (!user || !share) {
      return res.status(404).json({ error: "User or share not found" });
    }

    const holding = user.portfolio.find((p) => p.sharename === shareName);
    if (!holding || holding.quantity < quantity) {
      return res.status(400).json({ error: "Insufficient shares to sell" });
    }

    const totalValue = quantity * share.price;

    holding.quantity -= quantity;
    if (holding.quantity === 0) {
      user.portfolio = user.portfolio.filter((p) => p.sharename !== shareName);
    }

    user.TotalBalance += totalValue;
    await user.save();

    return res.status(200).json({
      message: "Shares sold successfully",
      received: totalValue,
      newBalance: user.TotalBalance,
      remainingShares: holding.quantity,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};