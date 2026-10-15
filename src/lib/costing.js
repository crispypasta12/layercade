// When an idea's saved cost may be out of date.
//
// Filament prices and calculator settings live in this browser's storage
// (see CostCalculator), so the calculator records when they last changed
// here. A cost saved before that, or before the calculator's maths last
// changed, is flagged on the Ideas board for recalculating.

const PRICES_CHANGED_KEY = 'calc_prices_changed_at';

// The per-piece / batch costing fix. Costs saved before this used the old maths.
const COST_MATHS_CHANGED_AT = '2026-10-15T20:50:00Z';

export function markPricesChanged() {
  try { localStorage.setItem(PRICES_CHANGED_KEY, new Date().toISOString()); } catch { /* not persisted */ }
}

export function pricesChangedAt() {
  let saved = null;
  try { saved = localStorage.getItem(PRICES_CHANGED_KEY); } catch { /* unavailable */ }
  return saved && saved > COST_MATHS_CHANGED_AT ? saved : COST_MATHS_CHANGED_AT;
}

export function isCostStale(idea, changedAt = pricesChangedAt()) {
  return Boolean(idea.costed_at && idea.est_cost != null && new Date(idea.costed_at) < new Date(changedAt));
}
