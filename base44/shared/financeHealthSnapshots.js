import { revenueSnapshot } from './financeRevenueSnapshot.js';

// Sources whose journal saves its posting evidence in its own shape: returns the live
// source fields and what the journal saved, so the health check can certify them.
// Null means the source is compared the standard way.
const WASTE_FIELDS = ['quantity', 'unit', 'cost_impact', 'waste_reason_id'];
export function healthSnapshotPair(entity, source, summary = {}) {
  if (entity === 'CateringReconciliation') return { current: revenueSnapshot(source), saved: summary.source_snapshot };
  if (entity === 'WasteDeclaration') return {
    current: { quantity: source.quantity_wasted, unit: source.unit, cost_impact: source.cost_impact, waste_reason_id: source.waste_reason_id },
    saved: summary.quantity === undefined ? null : Object.fromEntries(WASTE_FIELDS.map((k) => [k, summary[k]])),
  };
  return null;
}