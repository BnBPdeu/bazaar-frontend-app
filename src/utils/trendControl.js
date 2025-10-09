// trendControl.js
import { trendState } from "./trendState.js";

export function startSectorTrend({ sector, changePercent, durationSec = 60 }) {
  // changePercent can be +ve or -ve; you may also supply a "direction" string instead.
  const totalPct = Number(changePercent); // e.g. +3 => +3%
  const candlePeriodSec = 5; // matches your simulate tick window (5s)
  const candles = Math.max(1, Math.round(durationSec / candlePeriodSec));

  trendState.active = true;
  trendState.sector = sector;
  trendState.totalChangePct = totalPct;
  trendState.durationSec = durationSec;
  trendState.startedAt = new Date();
  trendState.endsAt = new Date(
    trendState.startedAt.getTime() + durationSec * 1000
  );
  trendState.candlesPlanned = candles;
  trendState.candlesApplied = 0;

  // We’ll apply the change approximately evenly per candle (linear drift).
  // Example: total +5% over N candles => about +5/N % per candle.
  trendState.perCandlePct = totalPct / candles; // percentage points per candle

  return { ok: true, trendState };
}

export function stopSectorTrend() {
  trendState.active = false;
  trendState.sector = null;
  trendState.totalChangePct = 0;
  trendState.durationSec = 0;
  trendState.startedAt = null;
  trendState.endsAt = null;
  trendState.perCandlePct = 0;
  trendState.candlesPlanned = 0;
  trendState.candlesApplied = 0;

  return { ok: true };
}
