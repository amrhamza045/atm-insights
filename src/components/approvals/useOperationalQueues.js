import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Same query keys as the queue components, so the cache is shared and the
// page can count/summarise without extra requests.
const usePage = (queryKey, entity, query, sort) =>
  useQuery({
    queryKey,
    queryFn: () => base44.entities[entity].filter(query, { sort, limit: 50 }),
  }).data?.items || [];

export default function useOperationalQueues() {
  const cateringPos = useQuery({
    queryKey: ["catering-pos-awaiting-approval"],
    queryFn: async () => {
      const all = await base44.entities.PurchaseOrder.filter({ order_source: "catering" }, "-created_date", 200);
      return all.filter((o) => ["pending_approval", "recommended"].includes(o.status));
    },
  }).data || [];

  return {
    cateringPos,
    withdrawals: usePage(["approvals-deposit-withdrawals"], "CateringPayment", { payment_type: "deposit_withdrawal", status: "pending" }, "-created_date"),
    attendance: usePage(["approvals-attendance-pending"], "Attendance", { status: "pending_hr_confirmation" }, "-created_date"),
    bonuses: usePage(["approvals-bonus-pending"], "DeliveryBonusRecord", { status: "pending" }, "-created_date"),
    expiry: usePage(["approvals-ops", "expiry"], "ExpiryReport", { status: "open" }, "expiry_date"),
    sessions: usePage(["approvals-ops", "sessions"], "CashierSession", { status: "open" }, "session_date"),
    shortages: usePage(["approvals-ops", "custody"], "CateringCustodyCheckpoint", { status: "shortage" }, "-created_date"),
  };
}