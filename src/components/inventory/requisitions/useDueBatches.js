import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { companyToday } from "@/components/utils/timezoneHelper";
import { REQUISITION_POLL_MS } from "@/components/catering/requisition/requisitionApi";

/** Scheduled (unreleased) batch slips due today or earlier, grouped by requisition id. */
export function useDueBatches(branchId) {
  const today = companyToday();
  const query = useQuery({
    queryKey: ["requisition-due-batches", branchId, today],
    queryFn: () => base44.entities.KitchenReleaseSlip.filter({
      ...(branchId ? { branch_id: branchId } : {}), is_requisition_batch: true, status: "scheduled", needed_by_date: { $lte: today },
    }, "needed_by_date", 200),
    refetchInterval: REQUISITION_POLL_MS,
  });
  const byRequisition = new Map();
  (query.data || []).forEach((s) => byRequisition.set(s.requisition_id, [...(byRequisition.get(s.requisition_id) || []), s]));
  return { byRequisition, today };
}

/** "due today" / "overdue" for a batch date. */
export const dueLabel = (date, today) => (date === today ? "due today" : "overdue");