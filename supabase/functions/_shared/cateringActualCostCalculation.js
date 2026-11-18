import { actualFood } from './cateringActualFood.js';
import { actualLabor } from './cateringActualLabor.js';
import { actualEquipment } from './cateringActualEquipment.js';
import { numberOrNull, roundMoney, flag } from './cateringActualCostCommon.js';
import { resolveMarginBenchmark, classifyLossAnalysis } from './cateringMarginBenchmark.js';
import { buildMarginBridge } from './cateringMarginBridge.js';

export const ACTUAL_COST_VERSION = 'purchase-history-v3-exceptions';
export function calculateActualCosts(sources) {
  const { event, reconciliation, quote } = sources;
  const warnings = [];
  const food = actualFood(sources, warnings);
  const labor = actualLabor(sources, warnings);
  const equipment = actualEquipment(sources, warnings);
  const estimated = numberOrNull(quote?.estimated_cost);
  const implausible = food.total < 0 || (estimated !== null && food.total > 3 * estimated);
  if (food.total < 0) flag(warnings, 'food_cost_negative', event.id);
  if (estimated !== null && food.total > 3 * estimated) flag(warnings, 'food_cost_over_3x_estimate', event.id, `Actual ${food.total}; estimate ${estimated}`);
  if (estimated === null) flag(warnings, 'estimated_food_cost_missing', event.id);
  const revenue = numberOrNull(reconciliation ? reconciliation.final_billing_total : event.total_paid);
  if (revenue === null) flag(warnings, 'actual_revenue_missing', event.id);
  if (!(revenue > 0)) flag(warnings, 'margin_percentage_undefined', event.id, 'Revenue is zero, negative or missing.');
  if (!reconciliation) flag(warnings, 'revenue_cash_basis_provisional', event.id);
  if (sources.reconciliations.filter(r => r.status === 'finalized').length > 1) flag(warnings, 'multiple_finalized_reconciliations', event.id, 'Most recently finalized record used.');
  // Manual post-event exceptions are a separate component so imported amounts are never double-counted.
  const exceptionRows = (sources.exceptions || []).map(x => ({ source_type: 'CateringCostException', source_id: x.id, category: x.category, amount: roundMoney(Number(x.amount) || 0), description: x.description, recorded_by: x.recorded_by }));
  const exceptionTotal = roundMoney(exceptionRows.reduce((sum, row) => sum + row.amount, 0));
  const total = roundMoney(food.total + labor.total + equipment.total + exceptionTotal);
  const margin = roundMoney((revenue || 0) - total);
  const benchmark = resolveMarginBenchmark(sources);
  const fields = {
    actual_food_cost: food.total, actual_labor_cost: labor.total, actual_equipment_cost: equipment.total,
    actual_exception_cost: exceptionTotal, actual_total_cost: total, actual_revenue: revenue || 0,
    actual_revenue_basis: reconciliation ? 'finalized_reconciliation' : 'total_paid',
    actual_margin: margin, actual_margin_percentage: revenue > 0 ? roundMoney(margin / revenue * 100) : null,
    actual_food_cost_implausible: implausible, actual_cost_status: warnings.length ? 'incomplete' : 'complete',
    actual_cost_warning_codes: [...new Set(warnings.map(w => w.code))], actual_cost_version: ACTUAL_COST_VERSION,
    applicable_target_margin_percentage: benchmark.percentage,
    applicable_target_margin_source: benchmark.source,
  };
  fields.loss_analysis_status = classifyLossAnalysis(fields, benchmark);
  const bridge = buildMarginBridge(sources, fields);
  const counts = Object.fromEntries(['slips', 'waste', 'returns', 'shifts', 'assignments', 'attendance', 'equipmentReservations', 'maintenance', 'invoices'].map(key => [key, sources[key].length]));
  counts.exceptions = exceptionRows.length;
  const audit = { version: ACTUAL_COST_VERSION, currency: 'EGP', event_id: event.id, event_name: event.event_name, event_date: event.event_date, branch_id: event.branch_id, event_source_updated_date: event.updated_date, fields, bridge, source_counts: counts, warnings, revenue_source: reconciliation ? { type: 'CateringReconciliation', id: reconciliation.id, updated_date: reconciliation.updated_date, final_billing_total: reconciliation.final_billing_total } : { type: 'CateringEvent', id: event.id, total_paid: event.total_paid }, estimated_food_source: { quote_id: quote?.id || null, estimated_cost: estimated }, food, labor, equipment: { total: equipment.total, rows: equipment.rows }, exceptions: { total: exceptionTotal, rows: exceptionRows } };
  return { fields, bridge, audit, equipmentUpdates: equipment.updates };
}
export function cancelledActualCosts(event) {
  const fields = Object.fromEntries(['actual_food_cost', 'actual_labor_cost', 'actual_equipment_cost', 'actual_total_cost', 'actual_revenue', 'actual_margin', 'actual_margin_percentage'].map(key => [key, null]));
  Object.assign(fields, { actual_revenue_basis: 'skipped_cancelled', actual_cost_status: 'skipped_cancelled', actual_cost_warning_codes: [], actual_food_cost_implausible: false, actual_cost_version: ACTUAL_COST_VERSION, loss_analysis_status: 'insufficient_data' });
  return { fields, equipmentUpdates: [], audit: { event_id: event.id, event_name: event.event_name, currency: 'EGP', version: ACTUAL_COST_VERSION, fields, source_counts: {}, warnings: [], reason: 'Cancelled events are excluded, consistent with existing event P&L. Previous runs remain in history.' } };
}