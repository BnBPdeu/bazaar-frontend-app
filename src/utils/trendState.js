// trendState.js
export const trendState = {
  active: false,
  sector: null,            // e.g. "Automobile"
  totalChangePct: 0,       // e.g. +5 means +5%
  durationSec: 60,         // total duration
  startedAt: null,
  endsAt: null,
  perCandlePct: 0,         // computed on start
  candlesPlanned: 0,
  candlesApplied: 0,
};
