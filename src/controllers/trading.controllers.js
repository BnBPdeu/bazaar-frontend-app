import { User } from "../models/user.models.js";
import { Shares } from "../models/share.models.js";
import { News } from "../models/news.models.js";

export const addBalanceToAll = async (req, res) => {
  try {
    const { balance } = req.body;

    if (!balance) {
      return res.status(400).json({ message: "Balance amount is required" });
    }

    // Add balance to ALL users at once
    const result = await User.updateMany(
      {}, // empty filter = all users
      { $inc: { TotalBalance: Number(balance) } } // increment by balance
    );

    return res.status(200).json({
      message: `Balance of ${balance} added to all users`,
      modifiedCount: result.modifiedCount, // number of users updated
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};

export const addBalanceToUser = async (req, res) => {
  try {
    console.log(req.body);
    const { Email, balance } = req.body;

    const user = await User.findOne({ Email });
    if (!user) {
      return res.status(402).json({ msg: "user not found" });
    }

    user.TotalBalance += Number(balance);
    await user.save();

    return res.status(200).json({ msg: "balnce added", user });
  } catch (error) {
    console.log(error);
    return res.status(404).json(error.message[0]);
  }
};

export const BuyShare = async (req, res) => {
  try {
    const { userId, shareId, sharename, quantity, price } = req.body;
    if (!userId || !sharename || !quantity || !price) {
      return res.status(402).json({ msg: "all fields are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(402).json("user not found ...");
    }

    const myshare = await Shares.findOne({ shareName: sharename });
    if (!myshare) {
      return res.status(404).json({ msg: "share not found" });
    }

    const cost = quantity * price;
    if (user.TotalBalance < cost) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    //update portfolio

    const share = user.portfolio.find((s) => s.sharename === sharename);
    if (share) {
      const totalQty = share.quantity + quantity;
      share.avgPrice =
        (share.avgPrice * share.quantity + price * quantity) / totalQty;
      share.quantity = totalQty;
      share.shareId = shareId;
    } else {
      user.portfolio.push({ shareId, sharename, quantity, avgPrice: price });
    }

    user.TotalBalance -= cost;

    // Save trade history
    user.trades.push({ sharename, type: "BUY", quantity, price });

    await user.save();
    res.json({ message: "Share bought successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: err.message });
  }
};

export const sellShare = async (req, res) => {
  try {
    const { userId, sharename, quantity, price } = req.body;
    if (!userId || !sharename || !quantity || !price) {
      return res.status(402).json({ msg: "all fields are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(402).json("user not found ...");
    }

    const myshare = await Shares.findOne({ shareName: sharename });
    if (!myshare) {
      return res.status(404).json({ msg: "share not found" });
    }

    const share = user.portfolio.find((s) => s.sharename === sharename);
    if (!share || share.quantity < quantity) {
      return res.status(400).json({ message: "Not enough shares to sell" });
    }
    share.quantity -= quantity;
    const totalsellprice = quantity * price;
    const brokerage = (totalsellprice * 0.06) / 100;
    user.TotalBalance += totalsellprice - brokerage;

    // remove share if quantity become zero
    if (share.quantity === 0) {
      user.portfolio = user.portfolio.filter((s) => s.sharename !== sharename);
    }

    user.trades.push({ sharename, type: "SELL", quantity, price });

    await user.save();
    res.json({ message: "Share sold successfully" });
  } catch (error) {
    console.log(error);
    res.status(402).json(error.message[0]);
  }
};

export const squareOff = async (req, res) => {
  try {
    const { userId, sharename, price } = req.body;

    if (!userId || !sharename || !price) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const marketShare = await Shares.findOne({ shareName: sharename });
    if (!marketShare) {
      return res.status(404).json({ msg: "Share not found in market" });
    }

    // ✅ Find the share inside user's portfolio
    const holding = user.portfolio.find((s) => s.sharename === sharename);
    if (!holding) {
      return res.status(400).json({ msg: "Share not found in portfolio" });
    }

    // 🔑 Sell ALL quantity stored in portfolio
    const sellQuantity = holding.quantity; // get all owned quantity
    const totalSellPrice = sellQuantity * price; // price × quantity
    const brokerage = totalSellPrice * 0.06 / 100;

    // ✅ Add amount to user's balance
    user.TotalBalance += totalSellPrice - brokerage;

    // ✅ Record trade
    user.trades.push({
      sharename,
      type: "SELL",
      quantity: sellQuantity,
      price,
    });

    // ✅ Remove this share from portfolio after selling all
    user.portfolio = user.portfolio.filter((s) => s.sharename !== sharename);

    await user.save();

    return res.status(200).json({
      message: `✅ All ${sellQuantity} shares of ${sharename} sold successfully`,
      totalSellPrice,
      balance: user.TotalBalance,
    });
  } catch (error) {
    console.error("SquareOff Error:", error);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const shortSell = async (req, res) => {
  try {
    const {
      shareId,
      userId,
      sharename,
      quantity,
      price: customPrice,
    } = req.body;

    if (!userId || !sharename || !quantity) {
      return res
        .status(400)
        .json({ msg: "userId, sharename and quantity are required" });
    }

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      return res.status(400).json({ msg: "Invalid quantity" });
    }

    // get live price if not provided
    let price = customPrice;
    if (typeof price === "undefined") {
      const market = await Shares.findOne({ shareName: sharename });
      if (!market) return res.status(404).json({ msg: "Share not found" });
      price = market.price;
    }
    price = Number(price);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const positionValue = Number((qty * price).toFixed(2));
    if (user.TotalBalance < positionValue) {
      return res
        .status(400)
        .json({ msg: "Insufficient balance to cover 100% margin" });
    }

    user.TotalBalance = Number((user.TotalBalance - positionValue).toFixed(2));

    user.shortPositions.push({
      shareId: shareId,
      sharename,
      quantity: qty,
      sellPrice: price,
      marginLocked: positionValue,
    });

    user.trades.push({
      sharename,
      type: "SHORT_SELL",
      quantity: qty,
      price,
    });

    await user.save();

    res.status(200).json({
      msg: `Short sold ${qty} ${sharename} at ₹${price}`,
      marginLocked: positionValue,
      balance: user.TotalBalance,
      shortPositions: user.shortPositions,
    });
  } catch (err) {
    console.error("shortSell error:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const coverShort = async (req, res) => {
  try {
    const { userId, sharename, buyPrice: customPrice } = req.body;

    if (!userId || !sharename) {
      return res.status(400).json({ msg: "userId and sharename are required" });
    }

    // get market price if not provided
    let buyPrice = customPrice;
    if (typeof buyPrice === "undefined") {
      const market = await Shares.findOne({ shareName: sharename });
      if (!market) return res.status(404).json({ msg: "Share not found" });
      buyPrice = market.price;
    }
    buyPrice = Number(buyPrice);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Find all short positions of this share
    const positions = user.shortPositions.filter(
      (p) => p.sharename.toLowerCase() === sharename.toLowerCase()
    );
    if (positions.length === 0) {
      return res
        .status(400)
        .json({ msg: "No short positions found for this share" });
    }

    let totalQty = 0;
    let totalLocked = 0;
    let realizedPL = 0;

    positions.forEach((pos) => {
      const pl = (pos.sellPrice - buyPrice) * pos.quantity;
      realizedPL += pl;
      totalQty += pos.quantity;
      totalLocked += pos.marginLocked;
    });

    // Remove covered positions
    user.shortPositions = user.shortPositions.filter(
      (p) => p.sharename.toLowerCase() !== sharename.toLowerCase()
    );

    // Release full margin + profit/loss
    user.TotalBalance = Number(
      (user.TotalBalance + totalLocked + realizedPL).toFixed(2)
    );

    // Record trade
    user.trades.push({
      sharename,
      type: "SHORT_COVER",
      quantity: totalQty,
      price: buyPrice,
    });

    await user.save();

    res.status(200).json({
      msg: `Covered ${totalQty} ${sharename} at ₹${buyPrice}`,
      realizedPL,
      marginReleased: totalLocked,
      balance: user.TotalBalance,
    });
  } catch (err) {
    console.error("coverShort error:", err);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

export const getTradeHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    res.json({ trades: user.trades });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getallTrade = async (req, res) => {
  try {
    const Trade = await User.find().select("_id fullName Email trades");
    if (!Trade) {
      return res.status(402).json({ msg: "trade not found" });
    }

    return res.status(200).json({ msg: "trade found", Trade });
  } catch (error) {
    console.log(error);
    return res.status(402).json(error.message[0]);
  }
};

export const dropHistoryField = async (req, res) => {
  try {
    const { shareId } = req.params;

    const updatedShare = await Shares.findByIdAndUpdate(
      shareId,
      { $unset: { history: "" } }, // removes the field
      { new: true }
    );

    if (!updatedShare) {
      return res.status(404).json({ message: "Share not found" });
    }

    res.json(updatedShare);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const dropAllHistory = async (req, res) => {
  try {
    await Shares.updateMany({}, { $unset: { history: "" } });

    return res
      .status(200)
      .json({ message: "All history fields have been deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export function getRealizedPL(trades = []) {
  let realized = 0;
  for (const t of trades) {
    if (
      t?.type === "SELL" &&
      typeof t?.avgBuyPrice === "number" &&
      typeof t?.price === "number"
    ) {
      realized += (t.price - t.avgBuyPrice) * (t.quantity ?? 0);
    }
  }
  return Number(realized.toFixed(2));
}

// Accepts livePrices as an object map OR an array of { sharename, price/lastHistory }
export function getUnrealizedPL(portfolio = [], livePrices = {}) {
  // Normalize prices into a { name: number } map
  let map = {};
  if (Array.isArray(livePrices)) {
    for (const s of livePrices) {
      const name =
        typeof s?.sharename === "string" ? s.sharename.trim() : s?.sharename;
      const price = Number(s?.price ?? s?.lastHistory?.close);
      if (name && Number.isFinite(price)) map[name] = price;
    }
  } else if (livePrices && typeof livePrices === "object") {
    // Already a map; coerce to numbers
    for (const [k, v] of Object.entries(livePrices)) {
      const n = Number(v);
      if (k && Number.isFinite(n)) map[k.trim()] = n;
    }
  }

  let unrealized = 0;

  for (const pos of portfolio) {
    const name =
      typeof pos?.sharename === "string"
        ? pos.sharename.trim()
        : pos?.sharename;
    const marketPrice = map[name];
    if (!Number.isFinite(marketPrice)) continue;

    // Support both buyPrice and avgPrice
    const entryPrice =
      typeof pos?.buyPrice === "number"
        ? pos.buyPrice
        : typeof pos?.avgPrice === "number"
        ? pos.avgPrice
        : NaN;

    const qty = Number(pos?.quantity ?? 0);

    if (Number.isFinite(entryPrice) && Number.isFinite(qty)) {
      unrealized += (marketPrice - entryPrice) * qty;
    }
  }

  return Number(unrealized.toFixed(2));
}

export const sendrelizedPLToSocket = async (io, userId, _livePrices) => {
  try {
    const user = await User.findById(userId).lean();
    const realized = getRealizedPL(user.trades || []);

    io.to(userId).emit("rpl_update", {
      realizedPL: realized,
      balance: user?.TotalBalance ?? 0,
    });
  } catch (error) {
    console.log("sendrelizedPLToSocket:", error);
  }
};

export const sendunrelizedPLToSocket = async (io, userId, livePrices) => {
  try {
    const user = await User.findById(userId).lean();
    const unrealized = getUnrealizedPL(user?.portfolio || [], livePrices);

    io.to(userId).emit("unpl_update", {
      unrealizedPL: unrealized,
      balance: user?.TotalBalance ?? 0,
    });
  } catch (error) {
    console.log("sendunrelizedPLToSocket:", error);
  }
};

let previousLeaderboard = [];

export const leaderBoardData = async (io) => {
  try {
    const topuser = await User.find({})
      .sort({ TotalBalance: -1 })
      .limit(20)
      .select("fullName Email TotalBalance");

    // Calculate rank changes
    const topuserWithChanges = topuser.map((user, index) => {
      const previousRank = previousLeaderboard.findIndex(
        (prev) => prev._id.toString() === user._id.toString()
      );

      let rankChange = 0;
      if (previousRank !== -1) {
        rankChange = previousRank - index;
      }

      return {
        ...user.toObject(),
        rankChange,
        balanceChange: previousLeaderboard[previousRank]
          ? user.TotalBalance - previousLeaderboard[previousRank].TotalBalance
          : 0,
      };
    });

    previousLeaderboard = topuser;
    io.emit("top-user", topuserWithChanges);
  } catch (error) {
    console.log(error);
  }
};

// Emit latest 5 news to all connected clients
export const emitLatestNews = async (io) => {
  try {
    const latestNews = await News.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title description ")
      .lean();

    io.emit("latestNews", latestNews); // emit to all sockets
  } catch (err) {
    console.error("Error emitting latest news:", err);
  }
};
