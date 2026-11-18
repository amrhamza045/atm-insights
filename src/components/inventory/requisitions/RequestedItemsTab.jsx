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
import RequestedItemsFilters from "./RequestedItemsFilters";
import RequisitionReplyPanel from "./RequisitionReplyPanel";
import { useDueBatches } from "./useDueBatches";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Inventory side: every non-draft requisition in the branch, filtered on the server. */
export default function RequestedItemsTab() {
  const { selectedBranchId } = useBranch();
  const [filters, setFilters] = useState({ status: "all", event: "", date: "", mine: false });
  const [openId, setOpenId] = useState(null);
  useLinkedRequisition(setOpenId);
  const due = useDueBatches(selectedBranchId);
  const branch = selectedBranchId ? { branch_id: selectedBranchId } : {};
  const query = {
    ...branch,
    status: filters.status === "all" ? { $ne: "draft" } : filters.status,
    ...(filters.mine ? { awaiting_side: "inventory" } : {}),
    ...(filters.date ? { event_date: filters.date } : {}),
    ...(filters.event.trim() ? { event_name: { $regex: escapeRegex(filters.event.trim()), $options: "i" } } : {}),
  };
  const list = useQuery({
    queryKey: ["requested-items", query],
    queryFn: () => base44.entities.Requisition.filter(query, "event_date", 100),
    refetchInterval: REQUISITION_POLL_MS,
  });
  const rows = list.data || [];

  return (
    <div className="space-y-4">
      <AwaitingYouCount flag="requisition_respond" query={{ ...branch, awaiting_side: "inventory", status: { $ne: "draft" } }} />
      <RequestedItemsFilters value={filters} onChange={setFilters} />
      {list.isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500 p-6 text-center bg-white rounded-lg border">No requested items match these filters.</p>
      ) : (
        <RequisitionStageBoard
          rows={rows}
          urgentSide="inventory"
          dueByRequisition={due.byRequisition}
          today={due.today}
          onOpen={(id) => setOpenId(r => id)}
        />
      )}
      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          {openId && <RequisitionReplyPanel key={openId} requisitionId={openId} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}