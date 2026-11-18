import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AwaitingYouCount from "@/components/catering/requisition/AwaitingYouCount";
import { useLinkedRequisition } from "@/components/catering/requisition/useLinkedRequisition";
import RequisitionApprovalCard from "./RequisitionApprovalCard";

export function usePendingRequisitions() {
  return useQuery({
    queryKey: ["approvals-requisitions"],
    queryFn: () => base44.entities.Requisition.filter({ status: "pending_approval" }, "-last_action_date", 100),
  });
}

/** Requisitions over the extra items limit, waiting on an approver. */
export default function RequisitionApprovalQueue() {
  const { data: items = [], isLoading } = usePendingRequisitions();
  // A notification link scrolls to its requisition once the queue has loaded.
  useLinkedRequisition((id) => setTimeout(() => (document.getElementById(`req-approval-${id}`) || document.getElementById("q-requisitions"))
    ?.scrollIntoView({ behavior: "smooth", block: "start" }), 300), !isLoading);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-3">
      <AwaitingYouCount flag="requisition_approve" query={{ status: "pending_approval", awaiting_side: "approver" }} />
      {!items.length
        ? <p className="text-sm text-muted-foreground">No requisitions waiting for approval.</p>
        : items.map((r) => <div key={r.id} id={`req-approval-${r.id}`} className="scroll-mt-40"><RequisitionApprovalCard requisitionId={r.id} /></div>)}
    </div>
  );
}