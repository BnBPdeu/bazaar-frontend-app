// src/utils/getNextPriceWithDrift.js
import { marketTrend } from "../utils/marketState.js";

// Copy of your base logic + a drift term (fraction per tick)
const randnBM = () => {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export const getNextPriceWithDrift = (lastPrice, opts = {}) => {
  const {
    dtSeconds = 1,
    volatilityScale = 1,
    driftFrac = 0, // <-- ONLY used by sector trend
  } = opts;

  const basePctVol = 0.0002;
  const vol =
    basePctVol * Math.sqrt(Math.max(0.0001, dtSeconds)) * volatilityScale;

  const z = Math.max(-0.8, Math.min(0.8, randnBM()));
  let pctChange = z * vol;

  // keep admin marketTrend the same as base
  if (marketTrend.mode === "bull") {
    pctChange += vol * 0.5 * marketTrend.strength;
  } else if (marketTrend.mode === "bear") {
    pctChange -= vol * 0.5 * marketTrend.strength;
  }

  // ✅ extra drift for the chosen sector
  pctChange += driftFrac;

  let absChange = lastPrice * pctChange;

  const MIN_TICK = 0.01;
  const MAX_TICK = 2.0;

  if (Math.abs(absChange) < MIN_TICK) {
    absChange = (absChange >= 0 ? 1 : -1) * MIN_TICK;
  } else if (Math.abs(absChange) > MAX_TICK) {
    absChange = (absChange >= 0 ? 1 : -1) * MAX_TICK;
  }

  const next = lastPrice + absChange;
  return parseFloat(Math.max(next, 0.01).toFixed(2));
};
