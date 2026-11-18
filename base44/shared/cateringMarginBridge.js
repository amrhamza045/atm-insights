import { numberOrNull, roundMoney } from './cateringActualCostCommon.js';

const EQUIPMENT_RECOVERY = new Set(['equipment_damage', 'equipment_loss']);
const costOf = (line) => numberOrNull(line?.line_cost) ?? roundMoney((Number(line?.quantity) || 0) * (Number(line?.unit_cost) || 0));

/** A quote's planned food cost: estimated_cost minus 'other' category lines (null when the quote has no cost). */
export function plannedFoodCostOfQuote(quote) {
  if (!quote || numberOrNull(quote.estimated_cost) === null) return null;
  const other = (quote.line_items || []).filter(line => line.cost_category === 'other').reduce((sum, line) => sum + costOf(line), 0);
  return roundMoney(Number(quote.estimated_cost) - roundMoney(other));
}

export function buildMarginBridge(sources, fields) {
  if (fields.actual_cost_status !== 'complete') return null;
  const quote = sources.quote;
  const expectedRevenue = numberOrNull(quote?.total) ?? 0;
  const expectedMargin = numberOrNull(quote?.estimated_margin) ?? roundMoney(expectedRevenue - (numberOrNull(quote?.estimated_cost) ?? 0));
  const quoteLines = quote?.line_items || [];
  const expectedOther = roundMoney(quoteLines.filter(line => line.cost_category === 'other').reduce((sum, line) => sum + costOf(line), 0));
  const expectedFood = plannedFoodCostOfQuote(quote) ?? roundMoney(-expectedOther);
  const expectedLabor = numberOrNull(sources.event?.estimated_labor_cost) ?? 0;
  const recovered = roundMoney((sources.reconciliation?.additional_charges || []).filter(line => EQUIPMENT_RECOVERY.has(line.category)).reduce((sum, line) => sum + (Number(line.amount) || 0), 0));
  const lines = [
    { key: 'revenue_variance', label: 'Revenue variance', expected_amount: expectedRevenue, actual_amount: fields.actual_revenue, delta: roundMoney(fields.actual_revenue - expectedRevenue - recovered) },
    { key: 'food_cost_variance', label: 'Food cost variance', expected_amount: expectedFood, actual_amount: fields.actual_food_cost, delta: roundMoney(expectedFood - fields.actual_food_cost) },
    { key: 'other_cost_variance', label: 'Other quoted cost variance', expected_amount: expectedOther, actual_amount: 0, delta: expectedOther },
    { key: 'labor_cost_variance', label: 'Labor cost variance', expected_amount: expectedLabor, actual_amount: fields.actual_labor_cost, delta: roundMoney(expectedLabor - fields.actual_labor_cost) },
    { key: 'labor_baseline_alignment', label: 'Expected labor baseline alignment', expected_amount: expectedLabor, actual_amount: null, delta: roundMoney(-expectedLabor) },
    { key: 'equipment_cost_variance', label: 'Equipment cost variance', expected_amount: 0, actual_amount: fields.actual_equipment_cost, delta: roundMoney(-fields.actual_equipment_cost) },
    { key: 'exception_cost_variance', label: 'Post-event exceptions', expected_amount: 0, actual_amount: fields.actual_exception_cost || 0, delta: roundMoney(-(fields.actual_exception_cost || 0)) },
    { key: 'client_recovered_equipment_costs', label: 'Client-recovered equipment costs', expected_amount: 0, actual_amount: recovered, delta: recovered },
  ];
  const totalDelta = roundMoney(lines.reduce((sum, line) => sum + line.delta, 0));
  const expectedDelta = roundMoney(fields.actual_margin - expectedMargin);
  const mismatch = roundMoney(totalDelta - expectedDelta);
  const ranking = [...lines].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).map((line, index) => ({ key: line.key, rank: index + 1, absolute_amount: roundMoney(Math.abs(line.delta)) }));
  return { expected_margin: expectedMargin, actual_margin: fields.actual_margin, expected_delta: expectedDelta, total_delta: totalDelta, mismatch_amount: mismatch, consistent: mismatch === 0, lines, ranking };
}