import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranchFilter } from "@/components/branches/BranchContext";

async function fetchAll(entity, query) {
  const out = [];
  let cursor;
  do {
    const page = await entity.filter(query, { limit: 500, cursor, sort: "event_date" });
    out.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return out;
}

// Reservations for the chosen view, plus the batches and people behind them.
export default function useKitchenCustody(view) {
  const branch = useBranchFilter();
  const query = view === "kitchen"
    ? { ...branch, status: "consumed", custody_quantity: { $gt: 0 } }
    : { ...branch, status: "reserved", quantity_reserved: { $gt: 0 } };

  return useQuery({
    queryKey: ["kitchenCustody", view, branch.branch_id || "all"],
    queryFn: async () => {
      const reservations = await fetchAll(base44.entities.CateringReservation, query);
      const orderIds = [...new Set(reservations.map((r) => r.production_order_id).filter(Boolean))];
      const emails = [...new Set(reservations.map((r) => r.consumed_by || r.reserved_by).filter(Boolean))];
      const [orders, employees] = await Promise.all([
        orderIds.length ? base44.entities.ProductionOrder.filter({ id: { $in: orderIds } }) : [],
        emails.length ? base44.entities.Employee.filter({ email: { $in: emails } }) : [],
      ]);
      const ordersById = Object.fromEntries(orders.map((o) => [o.id, o]));
      const nameByEmail = Object.fromEntries(employees.map((e) => [String(e.email).toLowerCase(), e.name]));
      return { reservations, ordersById, nameByEmail };
    },
  });
}