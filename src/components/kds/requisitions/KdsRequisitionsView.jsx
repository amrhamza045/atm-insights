import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useBranch } from "@/components/branches/BranchContext";
import RequisitionStageBoard from "@/components/catering/requisition/RequisitionStageBoard";
import AwaitingYouCount from "@/components/catering/requisition/AwaitingYouCount";
import { useLinkedRequisition } from "@/components/catering/requisition/useLinkedRequisition";
import { REQUISITION_POLL_MS } from "@/components/catering/requisition/requisitionApi";
import KdsRequisitionDetail from "./KdsRequisitionDetail";

/** Chef side. Built from Requisition records (branch-scoped by the data rules), not from catering events. */
export default function KdsRequisitionsView() {
  const { selectedBranchId } = useBranch();
  const [openId, setOpenId] = useState(null);
  useLinkedRequisition(setOpenId);
  const branch = selectedBranchId ? { branch_id: selectedBranchId } : {};
  const list = useQuery({
    queryKey: ["kds-requisitions", selectedBranchId],
    queryFn: () => base44.entities.Requisition.filter({ ...branch, status: { $ne: "cancelled" } }, "event_date", 100),
    refetchInterval: REQUISITION_POLL_MS,
  });
  const rows = list.data || [];

  return (
    <div className="space-y-3">
      <AwaitingYouCount flag="requisition_submit" query={{ ...branch, awaiting_side: "chef", status: { $ne: "cancelled" } }} />
      {list.isLoading ? (
        <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground bg-card rounded-lg border border-border">No requisitions for this branch</div>
      ) : (
        <RequisitionStageBoard
          rows={rows}
          urgentSide="chef"
          onOpen={(id) => setOpenId(id)}
        />
      )}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {openId && <KdsRequisitionDetail key={openId} requisitionId={openId} onSelectRequisition={setOpenId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}