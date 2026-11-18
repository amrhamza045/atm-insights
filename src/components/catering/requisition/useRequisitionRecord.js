import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { REQUISITION_POLL_MS } from "./requisitionApi";

/** One requisition with its active lines and permit trail, polled like the KDS panel. */
export function useRequisitionRecord(requisitionId) {
  const queryClient = useQueryClient();
  const record = useQuery({
    queryKey: ["requisition", requisitionId],
    queryFn: () => base44.entities.Requisition.get(requisitionId),
    enabled: !!requisitionId,
    refetchInterval: REQUISITION_POLL_MS,
  });
  const lines = useQuery({
    queryKey: ["requisition", requisitionId, "lines", record.data?.updated_date],
    queryFn: () => base44.entities.RequisitionLine.filter({ requisition_id: requisitionId }, "sort_order", 500),
    enabled: !!record.data,
  });
  const revisions = useQuery({
    queryKey: ["requisition", requisitionId, "revisions", record.data?.current_revision],
    queryFn: () => base44.entities.RequisitionRevision.filter({ requisition_id: requisitionId }, "-revision_number", 500),
    enabled: !!record.data,
  });
  const refresh = () => Promise.all(["requisition", "kds-requisitions", "requested-items", "approvals-requisitions"].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
  return {
    requisition: record.data,
    lines: (lines.data || []).filter((l) => l.is_active !== false),
    revisions: revisions.data || [],
    loading: record.isLoading || lines.isLoading,
    refresh,
  };
}