import { base44 } from "@/api/base44Client";

/** Purchase orders that were raised for catering events (recommended carts and shortfalls). */
export async function loadEventCartOrders() {
  const orders = await base44.entities.PurchaseOrder.list("-created_date", 500);
  return orders.filter((o) => o.catering_event_id || (o.catering_event_ids || []).length);
}

function ordersForEvent(orders, eventId) {
  return orders.filter(
    (o) =>
      o.status !== "cancelled" &&
      (o.catering_event_id === eventId || (o.catering_event_ids || []).includes(eventId))
  );
}

/**
 * One flag per event, telling the buyer at a glance whether a cart already
 * exists for it and how far it got:
 *  - none       → no cart raised yet
 *  - draft      → cart exists but still waiting for approval
 *  - ordered    → approved and ordered, goods not received yet
 *  - purchased  → the real purchase was recorded (stock received)
 */
export function eventCartStatus(orders, eventId) {
  const mine = ordersForEvent(orders, eventId);
  if (!mine.length) return { key: "none", label: "No cart yet", count: 0 };

  if (mine.some((o) => o.purchase_recorded_invoice_id || o.status === "delivered"))
    return { key: "purchased", label: "Purchased", count: mine.length };

  if (mine.some((o) => o.status === "pending" || o.status === "confirmed"))
    return { key: "ordered", label: "Ordered — not received", count: mine.length };

  return { key: "draft", label: "Cart awaiting approval", count: mine.length };
}