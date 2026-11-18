import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Loader2 } from "lucide-react";
import ApprovalBasis from "@/components/catering/requisition/ApprovalBasis";
import RequisitionLinesTable from "@/components/catering/requisition/RequisitionLinesTable";
import RequisitionHistory from "@/components/catering/requisition/RequisitionHistory";
import { useRequisitionRecord } from "@/components/catering/requisition/useRequisitionRecord";
import { isUncosted } from "@/components/catering/requisition/lineCosting";
import RequisitionApprovalActions from "./RequisitionApprovalActions";

export default function RequisitionApprovalCard({ requisitionId }) {
  const { requisition: r, lines, revisions, loading, refresh } = useRequisitionRecord(requisitionId);
  const [showHistory, setShowHistory] = useState(false);
  if (loading || !r) return <Card className="p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></Card>;
  if (r.status !== "pending_approval") return null;
  const request = revisions.find((v) => v.action === "approval_requested");
  const uncosted = lines.filter((l) => l.line_type === "extra" && l.inventory_decision !== "declined" && isUncosted(l));

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{r.requisition_number} · {r.event_name || "—"}</p>
          <p className="text-xs text-muted-foreground">{r.event_date || "no date"} · {r.branch_name || ""} · sent by {request?.actor_name || r.chef_name || "—"}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowHistory(true)}><History className="w-4 h-4" /> History</Button>
      </div>
      <ApprovalBasis values={r} />
      {r.approval_reason && <p className="text-sm text-warning-800">{r.approval_reason}</p>}
      {uncosted.length > 0 && <p className="text-xs text-muted-foreground">Uncosted extras: {uncosted.map((l) => l.inventory_item_name).join(", ")}</p>}
      {request?.comment && <p className="text-sm">Chef: “{request.comment}”</p>}
      <RequisitionLinesTable lines={lines} />
      <RequisitionApprovalActions requisition={r} refresh={refresh} />
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{r.requisition_number} history</DialogTitle></DialogHeader>
          <RequisitionHistory revisions={revisions} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}