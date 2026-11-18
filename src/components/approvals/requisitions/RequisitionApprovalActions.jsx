import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { decideRequisitionApproval, errorText } from "@/components/catering/requisition/requisitionApi";

/** Approve (optional comment) or reject (reason required) an over-limit requisition. */
export default function RequisitionApprovalActions({ requisition: r, refresh }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (decision) => {
    setBusy(true);
    try {
      await decideRequisitionApproval(r.id, r.current_revision || 0, decision, comment);
      toast.success(decision === "approve" ? "Approved — sent to Inventory" : "Rejected — returned to the chef");
      setComment("");
      await queryClient.invalidateQueries({ queryKey: ["approvals-requisitions"] });
    } catch (e) {
      toast.error(errorText(e, "That didn't work"));
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Textarea placeholder="Comment (required to reject)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => decide("approve")}><Check className="w-4 h-4" /> Approve</Button>
        <Button size="sm" variant="destructive" className="gap-1.5" disabled={busy || !comment.trim()} onClick={() => decide("reject")}><X className="w-4 h-4" /> Reject</Button>
      </div>
    </div>
  );
}