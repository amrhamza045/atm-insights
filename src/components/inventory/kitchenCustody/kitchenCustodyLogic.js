// Groups event reservations into one row per item.
// "kitchen" = pulled off the shelf and still held in event kitchen custody;
// "reserved" = still on the shelf, held for an event.
const num = (v) => Number(v) || 0;

export function heldQuantity(r, view) {
  return view === "kitchen" ? num(r.custody_quantity) : num(r.quantity_reserved);
}

export function staffFor(r, ordersById, nameByEmail) {
  const batch = r.production_order_id && ordersById[r.production_order_id];
  const assigned = (batch?.assigned_staff || []).map((s) => s.name).filter(Boolean);
  if (assigned.length) return assigned;
  const email = r.consumed_by || r.reserved_by;
  return email ? [nameByEmail[email.toLowerCase()] || email] : [];
}

export function groupByItem(reservations, view, ordersById, nameByEmail) {
  const items = {};
  for (const r of reservations) {
    const qty = heldQuantity(r, view);
    if (qty <= 0) continue;
    const item = (items[r.inventory_item_id] ||= {
      id: r.inventory_item_id, name: r.inventory_item_name || "Unnamed item",
      unit: r.unit || "", total: 0, holds: {},
    });
    item.total += qty;
    const hold = (item.holds[r.event_id] ||= {
      eventId: r.event_id, eventName: r.event_name || "Event", eventDate: r.event_date,
      quantity: 0, staff: new Set(), producing: new Set(),
    });
    hold.quantity += qty;
    staffFor(r, ordersById, nameByEmail).forEach((s) => hold.staff.add(s));
    if (r.produced_item_name) hold.producing.add(r.produced_item_name);
  }
  return Object.values(items)
    .map((i) => ({
      ...i,
      holds: Object.values(i.holds)
        .map((h) => ({ ...h, staff: [...h.staff], producing: [...h.producing] }))
        .sort((a, b) => String(a.eventDate || "").localeCompare(String(b.eventDate || ""))),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const fmtQty = (n) => Number(n.toFixed(3)).toLocaleString("en-US");