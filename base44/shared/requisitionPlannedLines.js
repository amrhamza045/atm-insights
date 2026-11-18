import { numberOrNull, roundMoney } from './cateringActualCostCommon.js';
import { computeConvertedUnitCost } from './unitConversion.js';

const keyOf = (x) => `${x.inventory_item_id}|${x.purpose || 'stock_pull'}|${x.produced_item_name || ''}`;
const isActive = (line) => line.is_active !== false;
const isActivePlanned = (line) => line.line_type === 'planned' && isActive(line);
/** Oldest first (created_date, then id): the line kept is always the same one, whichever run looks. */
const lineAge = (a, b) =>
  String(a.created_date || '').localeCompare(String(b.created_date || '')) || String(a.id).localeCompare(String(b.id));
/** Reason stored on an extra line whose item cost is 0. */
export const ZERO_COST_REASON = 'The inventory item cost is 0';
/**
 * Older lines predate estimated_cost_status: a null unit cost meant "no comparable cost".
 * An extra line at a unit cost of 0 is uncosted too (also covers extras saved before that rule).
 */
export const isCosted = (line) => (line.estimated_cost_status ? line.estimated_cost_status === 'costed' : line.estimated_unit_cost != null)
  && !(line.line_type === 'extra' && Number(line.estimated_unit_cost) === 0);

/**
 * Cost of a line. InventoryItem.cost_per_unit is per its cost unit (purchase unit, else unit).
 * Resolves unit conversions through the centralized UnitConversionRule + built-in metric table;
 * a line with no valid conversion rule stays uncosted — never costed at zero.
 * zeroIsUncosted (extra lines): an item cost of 0 is uncosted as well.
 */
export function lineCosting(item, unit, { zeroIsUncosted = false, rules = [] } = {}) {
  const uncosted = (reason) => ({ estimated_unit_cost: null, estimated_cost_status: 'uncosted', uncosted_reason: reason });
  if (!item) return uncosted('Inventory item not found');
  const cost = numberOrNull(item.cost_per_unit);
  const costUnit = String(item.purchase_unit_label || item.unit || '').trim();
  if (cost === null) return uncosted('The inventory item has no cost');
  if (zeroIsUncosted && cost === 0) return uncosted(ZERO_COST_REASON);
  if (!costUnit) return uncosted('The inventory item has no cost unit');

  const conv = computeConvertedUnitCost(item, unit, rules);
  if (!conv.ok) {
    return uncosted(`Requested in ${unit || 'no unit'}, but the item is costed per ${costUnit} — no unit conversion data`);
  }
  return { estimated_unit_cost: conv.unitCost, estimated_cost_status: 'costed', uncosted_reason: '' };
}

export const snapshotOf = (line, before, after, reason = '') => ({
  line_id: line.id, inventory_item_name: line.inventory_item_name || '', line_type: line.line_type,
  quantity_before: before, quantity_after: after, decision: line.inventory_decision || 'pending', reason, comment: '',
});

const lineFields = (r, costing) => ({
  reservation_id: r.id, inventory_item_id: r.inventory_item_id, inventory_item_name: r.inventory_item_name || '',
  unit: r.unit || '', purpose: r.purpose || 'stock_pull', produced_item_name: r.produced_item_name || '',
  production_order_id: r.production_order_id || '',
  system_minimum_quantity: Number(r.quantity_reserved) || 0,
  requested_quantity: Number(r.quantity_reserved) || 0,
  needed_by_date: r.needed_by_date || r.event_date || undefined, ...costing,
});

/**
 * Draft re-sync of PLANNED lines, keyed on reservation_id: one active planned line per
 * reserved reservation.
 */
export function planLineSync(lines, reservations, costFor) {
  const reserved = new Set(reservations.map((r) => r.id));
  const byReservation = new Map();
  const orphans = new Map();
  for (const l of lines.filter(isActivePlanned).sort(lineAge)) {
    if (reserved.has(l.reservation_id)) { if (!byReservation.has(l.reservation_id)) byReservation.set(l.reservation_id, l); }
    else orphans.set(keyOf(l), [...(orphans.get(keyOf(l)) || []), l]);
  }
  let sort = lines.reduce((max, l) => Math.max(max, Number(l.sort_order) || 0), 0);
  const creates = [], updates = [], changes = [];
  for (const r of reservations) {
    const fields = lineFields(r, costFor(r));
    const line = byReservation.get(r.id) || orphans.get(keyOf(fields))?.shift();
    if (!line) {
      creates.push({ ...fields, line_type: 'planned', inventory_decision: 'pending', chef_response: 'none', is_agreed: false, is_active: true, sort_order: ++sort });
      continue;
    }
    updates.push({ id: line.id, ...fields });
    if (Number(line.requested_quantity) !== fields.requested_quantity)
      changes.push(snapshotOf(line, Number(line.requested_quantity), fields.requested_quantity, 'Quantity updated by replanning'));
  }
  const deactivations = [...orphans.values()].flat();
  deactivations.forEach((l) => changes.push(snapshotOf(l, Number(l.requested_quantity), null, 'Removed: its reservation was released by replanning')));
  return { creates, updates, deactivations, changes };
}

/** Active planned lines that share a reservation_id with an older active line — the oldest is kept. */
export function duplicatePlannedLines(lines) {
  const seen = new Set();
  return lines.filter((l) => isActivePlanned(l) && l.reservation_id).sort(lineAge)
    .filter((l) => (seen.has(l.reservation_id) ? true : (seen.add(l.reservation_id), false)));
}

/**
 * Requisition rollups over ACTIVE lines: totals add costed lines only; uncosted lines are counted,
 * never added as zero.
 */
export function costTotals(lines) {
  const active = lines.filter(isActive);
  const sum = (type) => roundMoney(active.filter((l) => l.line_type === type && isCosted(l))
    .reduce((s, l) => s + (Number(l.requested_quantity) || 0) * Number(l.estimated_unit_cost), 0));
  const count = (test) => active.filter(test).length;
  const decision = (d) => count((l) => (l.inventory_decision || 'pending') === d);
  return {
    planned_estimated_cost: sum('planned'), extras_estimated_cost: sum('extra'), uncosted_line_count: count((l) => !isCosted(l)),
    line_counts: {
      active: active.length, planned: count((l) => l.line_type === 'planned'), extra: count((l) => l.line_type === 'extra'),
      pending: decision('pending'), confirmed: decision('confirmed'), edited: decision('edited'), declined: decision('declined'),
      agreed: count((l) => l.is_agreed === true),
    },
  };
}