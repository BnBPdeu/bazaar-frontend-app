// simulateSectorTrend.js
import { Shares } from "../models/share.models.js"; // adjust path
import { trendState } from "./trendState.js";

// IMPORTANT: reuse your existing getNextPrice
import { getNextPriceWithDrift } from "./getNextPriceWithDrift.js";

export const simulateSectorTrend = async (io) => {
  if (!trendState.active) return;

  try {
    const shares = await Shares.find().sort({ shareName: 1 }).lean();

    const now = new Date();
    const tickCount = 6; // keep your 6 ticks per 5 seconds
    const windowSeconds = 5;
    const dtSeconds = windowSeconds / tickCount;
    const startMs = now.getTime() - windowSeconds * 1000;

    // Convert "per candle percent" to fractional drift per tick
    // Example: perCandlePct = +0.8 (%). perTickDrift ≈ 0.008 / tickCount
    const perCandleFrac = (trendState.perCandlePct || 0) / 100;
    const perTickDrift = perCandleFrac / tickCount;

    const livePayload = new Array(shares.length);

    await Promise.all(
      shares.map(async (share, index) => {
        const lastCandle = share.history?.at(-1) || null;
        const prevClose = lastCandle ? lastCandle.close : share.price || 0;
        const open = prevClose;

        let price = open;
        const isInTrendSector = share.sector === trendState.sector;

        const ticks = [];
        for (let i = 0; i < tickCount; i++) {
          const tickTime = new Date(
            startMs + Math.round((i + 1) * dtSeconds * 1000)
          );

          // Base stochastic step
          let next = getNextPriceWithDrift(price, { dtSeconds });

          if (isInTrendSector) {
            // Apply drift multiplicatively (keeps volatility but nudges direction)
            next = next * (1 + perTickDrift);
          }

          price = next;
          ticks.push({ changesprice: price, time: tickTime });
        }

        const close = ticks.length
          ? ticks[ticks.length - 1].changesprice
          : open;
        const pricesForHL = [open, ...ticks.map((t) => t.changesprice)];
        const high = Math.max(...pricesForHL);
        const low = Math.min(...pricesForHL);

        const candle = { timestamp: now, open, high, low, close, ticks };

        await Shares.updateOne(
          { _id: share._id },
          {
            $push: { history: { $each: [candle], $slice: -200 } },
            $set: { price: close },
          }
        );

        livePayload[index] = {
          shareId: share._id,
          sharename: share.shareName,
          price: close,
          symbol: share?.symbol,
          Image: share?.image,
          lastHistory: candle,
        };
      })
    );

    io.emit(
      "shareliveprice",
      livePayload.map((share) => ({
        shareId: share.shareId,
        sharename: share.sharename,
        price: share.price,
        symbol: share.symbol,
        Image: share.Image,
        lastHistory: share.lastHistory, // latest candle object
      }))
    );

    // If we have completed the planned candles, auto-stop the trend
    trendState.candlesApplied += 1;
    if (
      trendState.candlesApplied >= trendState.candlesPlanned ||
      (trendState.endsAt && now >= trendState.endsAt)
    ) {
      // End trend and return to normal simulation on next cron tick
      const { stopSectorTrend } = await import("./trendControl.js");
      stopSectorTrend();
    }
  } catch (err) {
    console.error("❌ Error in simulateSectorTrend:", err);
  }
};
