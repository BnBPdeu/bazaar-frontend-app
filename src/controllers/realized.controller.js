// controllers/realized.controller.js
import { User } from "../models/user.models.js";

/**
 * Compute realized P/L using FIFO matching on trades.
 * Supports: BUY, SELL, SHORT_SELL, SHORT_COVER.
 * Returns { realizedPL, bySymbol }
 */
function computeRealizedPLFIFO(trades = []) {
  // Normalize & sort by time (ascending)
  const txs = [...(trades || [])].sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime();
    const tb = new Date(b.timestamp || 0).getTime();
    return ta - tb;
  });

  // Per-symbol lot queues
  const longLots = new Map(); // symbol -> [{ qty, price }]
  const shortLots = new Map(); // symbol -> [{ qty, price }]  // price here is the short *sell* price

  // Result aggregates
  const bySymbol = {}; // { symbol: number }
  let realized = 0;

  const addRealized = (name, amount) => {
    realized += amount;
    bySymbol[name] = (bySymbol[name] || 0) + amount;
  };

  const getName = (t) =>
    typeof t?.sharename === "string" ? t.sharename.trim() : t?.sharename;

  const q = (n) => (Number.isFinite(+n) ? +n : 0);
  const p = (n) => (Number.isFinite(+n) ? +n : NaN);

  for (const t of txs) {
    const name = getName(t);
    if (!name) continue;

    const qty = q(t.quantity);
    const price = p(t.price);
    if (!Number.isFinite(price) || qty <= 0) continue;

    // Ensure queues
    if (!longLots.has(name)) longLots.set(name, []);
    if (!shortLots.has(name)) shortLots.set(name, []);

    switch (t.type) {
      case "BUY": {
        // add a long lot
        longLots.get(name).push({ qty, price });
        break;
      }

      case "SELL": {
        // consume from long lots (FIFO)
        let remaining = qty;
        const lots = longLots.get(name);

        while (remaining > 0 && lots.length) {
          const lot = lots[0];
          const used = Math.min(remaining, lot.qty);
          const pl = (price - lot.price) * used;

          addRealized(name, Number(pl.toFixed(2)));

          lot.qty -= used;
          remaining -= used;
          if (lot.qty === 0) lots.shift();
        }

        // If remaining > 0 here, it means a sell without inventory; we ignore the remainder.
        break;
      }

      case "SHORT_SELL": {
        // add a short lot (price is the short sell price)
        shortLots.get(name).push({ qty, price });
        break;
      }

      case "SHORT_COVER": {
        // consume from short lots (FIFO)
        let remaining = qty;
        const lots = shortLots.get(name);

        while (remaining > 0 && lots.length) {
          const lot = lots[0];
          const used = Math.min(remaining, lot.qty);
          // realized for shorts = (sellPrice - coverBuyPrice) * quantity
          const pl = (lot.price - price) * used;

          addRealized(name, Number(pl.toFixed(2)));

          lot.qty -= used;
          remaining -= used;
          if (lot.qty === 0) lots.shift();
        }

        // If remaining > 0 here, you covered more than you shorted; ignore remainder.
        break;
      }

      default:
        // Ignore other types
        break;
    }
  }

  // Round final totals
  realized = Number(realized.toFixed(2));
  for (const k of Object.keys(bySymbol)) {
    bySymbol[k] = Number(bySymbol[k].toFixed(2));
  }

  return { realizedPL: realized, bySymbol };
}

/**
 * GET /api/trade/realized/:userId
 * Returns realized P/L computed from trade history (FIFO).
 * Response: { realizedPL: number, bySymbol: { [name]: number } }
 */
export const getRealizedPLController = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ msg: "userId is required" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ msg: "User not found" });

    const { realizedPL, bySymbol } = computeRealizedPLFIFO(user.trades || []);
    return res.status(200).json({ realizedPL, bySymbol });
  } catch (err) {
    console.error("getRealizedPLController error:", err);
    return res.status(500).json({ msg: "Internal Server Error" });
  }
};
