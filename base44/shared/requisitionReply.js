import { readAll, roundMoney } from './cateringActualCostCommon.js';
import { toStockQuantity, convertQuantity, getItemStockUnit } from './unitConversion.js';

const DECISIONS = ['confirmed', 'edited', 'declined'];

/** Agreed lines (inventory confirmed, or the chef accepted inventory's edit / decline) are locked for both sides. */
export const isAgreed = (line) => line.is_agreed === true;
const isActive = (line) => line.is_active !== false;
/** Active lines still being negotiated. */
export const openLines = (lines) => lines.filter((l) => isActive(l) && !isAgreed(l));

/** The agreed quantity a decision implies (null when declined). */
export const agreedOf = (line, d) =>
  d.decision === 'confirmed' ? Number(line.requested_quantity) || 0 : d.decision === 'edited' ? roundMoney(Number(d.agreed_quantity)) : null;

/** Every open line needs exactly one valid decision; agreed lines are locked. Returns a list of problems (empty = valid). */
export function decisionProblems(lines, decisions) {
  const ids = new Set(lines.map((l) => l.id));
  const problems = [...decisions.keys()].filter((id) => !ids.has(id)).map((id) => `Line ${id} is not open on this requisition (agreed lines are locked)`);
  for (const l of lines) {
    const d = decisions.get(l.id);
    const name = l.inventory_item_name || l.id;
    if (!d || !DECISIONS.includes(d.decision)) { problems.push(`${name}: no decision`); continue; }
    const reason = String(d.reason || '').trim();
    if (d.decision === 'edited') {
      const qty = Number(d.agreed_quantity);
      if (!(qty > 0)) problems.push(`${name}: the agreed quantity must be above 0`);
      else if (roundMoney(qty) === roundMoney(Number(l.requested_quantity))) problems.push(`${name}: an edit must change the quantity (use Confirm otherwise)`);
      else if (l.line_type === 'extra' && roundMoney(qty) > roundMoney(Number(l.requested_quantity))) problems.push(`${name}: an extra can't be agreed above the chef's requested ${l.requested_quantity}`);
      if (!reason) problems.push(`${name}: a reason is required for an edit`);
    }
    if (d.decision === 'declined' && !reason) problems.push(`${name}: a reason is required to decline`);
  }
  return problems;
}

/**
 * Enforce the money cap on Inventory's reply for an additional requisition:
 * Inventory is still limited by the event's remaining money allowance (or the CEO-approved cap if approved)
 * so Kitchen and Inventory cannot work together to get more items and work around the system.
 */
export function allowanceReplyProblem(requisition, activeLines, decisions, remainingAllowance) {
  if (!requisition?.is_additional) return null;
  const cap =
    requisition.approval_status === 'approved' && requisition.approved_extras_cost != null
      ? Number(requisition.approved_extras_cost)
      : remainingAllowance != null
      ? Number(remainingAllowance)
      : null;
  if (cap === null || !Number.isFinite(cap)) return null;

  let totalAgreedCost = 0;
  for (const l of activeLines) {
    if (l.is_active === false) continue;
    const d = decisions.get(l.id);
    const qty = isAgreed(l)
      ? Number(l.agreed_quantity) || 0
      : d
      ? agreedOf(l, d) || 0
      : 0;
    if (qty > 0 && l.estimated_unit_cost != null) {
      totalAgreedCost = roundMoney(totalAgreedCost + qty * Number(l.estimated_unit_cost));
    }
  }
  if (totalAgreedCost > cap + 1e-6) {
    return `Inventory agreed total (${totalAgreedCost} EGP) exceeds this additional requisition's limit of ${cap} EGP`;
  }
  return null;
}

/**
 * Confirmed/edited lines whose item no longer has enough free stock for this reply's total on that item.
 * Converts each line's agreed quantity (`l.unit`) into the item's stock unit before comparing against `free`.
 */
export function stockProblems(lines, decisions, free, itemById = new Map(), rules = []) {
  const needInStock = new Map();
  for (const l of lines) {
    const qty = agreedOf(l, decisions.get(l.id));
    if (!qty) continue;
    const item = itemById.get(l.inventory_item_id);
    const conv = item ? toStockQuantity(qty, l.unit, item, rules) : { ok: true, quantity: qty };
    const stockQty = conv.ok ? conv.quantity : qty;
    needInStock.set(l.inventory_item_id, roundMoney((needInStock.get(l.inventory_item_id) || 0) + stockQty));
  }
  return lines.filter((l) => {
    const qty = agreedOf(l, decisions.get(l.id));
    if (!qty) return false;
    return (needInStock.get(l.inventory_item_id) || 0) > (free.get(l.inventory_item_id) ?? 0) + 1e-9;
  }).map((l) => {
    const item = itemById.get(l.inventory_item_id);
    const stockUnit = getItemStockUnit(item) || l.unit || '';
    const totalStock = needInStock.get(l.inventory_item_id) || 0;
    const availStock = Math.max(0, free.get(l.inventory_item_id) ?? 0);
    const shortfallStock = roundMoney(totalStock - availStock);
    // Express shortfall in the line's unit if convertible, else stock unit
    const backConv = item && l.unit ? convertQuantity(shortfallStock, stockUnit, l.unit, { item, itemId: item.id, rules }) : null;
    const freeBackConv = item && l.unit ? convertQuantity(free.get(l.inventory_item_id) ?? 0, stockUnit, l.unit, { item, itemId: item.id, rules }) : null;
    const totalBackConv = item && l.unit ? convertQuantity(totalStock, stockUnit, l.unit, { item, itemId: item.id, rules }) : null;
    return {
      line_id: l.id,
      inventory_item_id: l.inventory_item_id,
      item: l.inventory_item_name || '',
      agreed: agreedOf(l, decisions.get(l.id)),
      item_total: totalBackConv?.ok ? roundMoney(totalBackConv.quantity) : totalStock,
      free: freeBackConv?.ok ? roundMoney(freeBackConv.quantity) : (free.get(l.inventory_item_id) ?? 0),
      shortfall: backConv?.ok ? roundMoney(backConv.quantity) : shortfallStock,
      unit: l.unit || stockUnit,
    };
  });
}

/** Release one reservation if it is still held. */
export async function releaseReservation(svc, reservation, by, reason) {
  if (reservation?.status !== 'reserved') return;
  await svc.entities.CateringReservation.update(reservation.id, {
    status: 'released', released_by: by || '', released_date: new Date().toISOString(), release_reason: reason,
  });
}

/**
 * Make a decided line's reservation match its decision. `held` maps reservation id → reserved reservation.
 */
export async function applyLineReservation(svc, requisition, line, held, freeQty, by) {
  const current = line.reservation_id ? held.get(line.reservation_id) : null;
  if (!line.agreed_quantity) {
    await releaseReservation(svc, current, by, `Declined by Inventory on ${requisition.requisition_number}: ${line.decision_reason}`);
    return null;
  }
  if (current) {
    if (roundMoney(Number(current.quantity_reserved)) !== line.agreed_quantity)
      await svc.entities.CateringReservation.update(current.id, { quantity_reserved: line.agreed_quantity, shortfall_quantity: 0, available_at_reservation: freeQty });
    return current.id;
  }
  const created = await svc.entities.CateringReservation.create({
    branch_id: requisition.branch_id, branch_name: requisition.branch_name || '', event_id: requisition.event_id, event_name: requisition.event_name || '',
    event_date: requisition.event_date, quote_id: requisition.created_from_quote_id || '', inventory_item_id: line.inventory_item_id,
    inventory_item_name: line.inventory_item_name || '', unit: line.unit || '',
    purpose: line.purpose === 'production_input' ? 'production_input' : 'stock_pull',
    produced_item_name: line.produced_item_name || '', production_order_id: line.production_order_id || '',
    quantity_reserved: line.agreed_quantity, available_at_reservation: freeQty, shortfall_quantity: 0,
    needed_by_date: line.needed_by_date || requisition.event_date, status: 'reserved', reserved_by: by || '',
    notes: `${line.line_type === 'extra' ? 'Extra request' : 'Planned line'} agreed on ${requisition.requisition_number}`,
  });
  return created.id;
}

/** The event's reservation rollup from its live reserved reservations (same states the planner writes). */
export async function refreshEventReservationRollup(svc, eventId) {
  const held = await readAll(svc.entities.CateringReservation, { event_id: eventId, status: 'reserved' });
  const short = held.filter((r) => Number(r.shortfall_quantity) > 0).length;
  await svc.entities.CateringEvent.update(eventId, {
    inventory_reserved: held.length > 0,
    reservation_status: held.length === 0 ? 'none' : short ? 'shortfall' : 'reserved',
    reservation_shortfall_count: short,
    reservation_last_run: new Date().toISOString(),
  });
}