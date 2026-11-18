import { convertQuantity, normalizeUnit, roundQty } from "@/lib/unitConversion";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const LINKED = ["po_pending", "po_approved"];
const isOpen = (o) => !["cancelled", "delivered", "rejected"].includes(o.status) && !o.purchase_recorded_invoice_id;
const neededBy = (r) => r.needed_by_date || r.event_date || "";

/**
 * The Recommended Cart's netting, per shortfall: quantities on open catering orders
 * for an event count against that event's missing items. Each order line is counted
 * once — what is already promised to shortfalls linked to that order comes off first,
 * then the rest covers unlinked shortfalls, earliest need first.
 * Converts between the PO line's purchase unit (e.g. kg/L) and the reservation's unit (e.g. g/ml).
 * Returns Map(reservationId → { onOrder, missing, orders }) for the unlinked shortfalls.
 */
export function netShortfallsAgainstOpenOrders(reservations, orders, unitRules = []) {
  const lines = (orders || []).filter(isOpen).flatMap((o) => {
    const events = [o.catering_event_id, ...(o.catering_event_ids || [])].filter(Boolean);
    return (o.items || [])
      .filter((i) => i.inventory_item_id && i.approval_status !== "rejected")
      .map((i) => ({
        poId: o.id,
        number: o.order_number,
        events,
        itemId: i.inventory_item_id,
        unit: i.unit || i.purchase_unit_label || "",
        left: Number(i.quantity_ordered) || 0,
      }));
  });

  const draw = (pool, need, reqUnit, itemId) => {
    let rest = need;
    const used = [];
    pool.forEach((l) => {
      if (rest <= 0 || l.left <= 0) return;
      const poUnit = l.unit || reqUnit || "";
      const targetUnit = reqUnit || poUnit || "";
      if (poUnit && targetUnit && normalizeUnit(poUnit) !== normalizeUnit(targetUnit)) {
        const leftInReq = convertQuantity(l.left, poUnit, targetUnit, { itemId, rules: unitRules, decimals: 6 });
        if (leftInReq.ok && leftInReq.factor > 0) {
          const takeInReq = Math.min(leftInReq.quantity, rest);
          const takeInPo = takeInReq / leftInReq.factor;
          l.left = Math.max(0, roundQty(l.left - takeInPo, 6));
          rest = Math.max(0, round2(rest - takeInReq));
          used.push(l.number);
          return;
        }
      }
      const take = Math.min(l.left, rest);
      l.left = roundQty(l.left - take, 6);
      rest = round2(rest - take);
      used.push(l.number);
    });
    return { rest, used };
  };

  (reservations || [])
    .filter((r) => LINKED.includes(r.procurement_status))
    .forEach((r) =>
      draw(
        lines.filter((l) => l.poId === r.purchase_order_id && l.itemId === r.inventory_item_id),
        Number(r.shortfall_quantity) || 0,
        r.unit,
        r.inventory_item_id
      )
    );

  const result = new Map();
  (reservations || [])
    .filter((r) => ["none", "po_cancelled"].includes(r.procurement_status || "none"))
    .sort((a, b) => neededBy(a).localeCompare(neededBy(b)))
    .forEach((r) => {
      const short = Number(r.shortfall_quantity) || 0;
      const { rest, used } = draw(
        lines.filter((l) => l.itemId === r.inventory_item_id && l.events.includes(r.event_id)),
        short,
        r.unit,
        r.inventory_item_id
      );
      result.set(r.id, { onOrder: round2(short - rest), missing: rest, orders: [...new Set(used)] });
    });
  return result;
}