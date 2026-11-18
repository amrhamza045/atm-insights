import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Live purchase orders bringing each item of a waiting release slip's event.
 * Read straight from the orders, so a slip reflects an approval or a delivery
 * the moment it happens. An open order wins over one already received.
 * Returns Map(inventoryItemId → { number, status }).
 */
export function useSlipLineOrders(slip) {
  const waiting = slip?.status === "scheduled" && !!slip?.event_id;
  const { data: orders = [] } = useQuery({
    queryKey: ["slip-line-orders", slip?.id, slip?.event_id],
    queryFn: () => base44.entities.PurchaseOrder.filter({
      order_source: "catering",
      status: { $ne: "cancelled" },
      $or: [{ catering_event_id: slip.event_id }, { catering_event_ids: slip.event_id }],
    }, "-created_date", 100),
    enabled: waiting,
  });

  const byItem = new Map();
  orders.forEach((o) => {
    const status = o.purchase_recorded_invoice_id ? "delivered" : o.status;
    (o.items || []).forEach((i) => {
      if (!i.inventory_item_id || i.approval_status === "rejected") return;
      const prev = byItem.get(i.inventory_item_id);
      if (!prev || (prev.status === "delivered" && status !== "delivered")) {
        byItem.set(i.inventory_item_id, { number: o.order_number, status });
      }
    });
  });
  return byItem;
}