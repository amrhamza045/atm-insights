import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { formatMoney } from "@/components/treasury/treasuryApi";

export default function ExpenseApprovalsTab({
  disbursements = [],
  currency = "EGP",
  canApprove,
  selfBypass,
  currentUserEmail,
  onDecide,
  busy,
}) {
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState("");
  const pending = disbursements.filter((d) => d.status === "pending");

  const confirmReject = () => {
    if (!rejectTarget) return;
    onDecide({ disbursement_id: rejectTarget.id, decision: "reject", rejection_reason: reason }, () => {
      setRejectTarget(null);
      setReason("");
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pending Expense & Vendor Approvals ({pending.length})</h2>
        <p className="text-xs text-muted-foreground">
          Approved items immediately deduct from the selected Staff Custody or Payment Method and post balanced General Ledger entries.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            All expense and vendor disbursements have been reviewed.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((d) => {
            const isOwn =
              String(d.requested_by || "").toLowerCase() === String(currentUserEmail || "").toLowerCase();
            const blockedSelf = isOwn && !selfBypass;
            return (
              <Card key={d.id} className="border-warning-300 bg-warning-50/40">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>
                        {d.disbursement_kind === "vendor_payment" ? "Vendor Payment" : "Operating Expense"}
                      </Badge>
                      <span className="font-semibold">
                        {d.disbursement_kind === "vendor_payment"
                          ? d.supplier_name
                          : `${d.expense_type_name} (${d.expense_account_code})`}
                      </span>
                      <Badge variant="outline">
                        {d.source_type === "custody"
                          ? `From Custody · ${d.custody_holder_name}`
                          : `From Method · ${d.payment_method_name || d.payment_method}`}
                      </Badge>
                    </div>
                    <p className="text-sm">{d.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Date: {d.entry_date}
                      {d.branch_name ? ` · ${d.branch_name}` : ""}
                      {d.reference ? ` · Ref: ${d.reference}` : ""}
                      {` · Requested by ${d.requested_by}`}
                    </p>
                    {canApprove && blockedSelf && (
                      <p className="text-xs text-warning-800">
                        Awaiting a second approver in System Role Groups (you submitted this disbursement).
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold">{formatMoney(d.currency || currency, d.amount)}</p>
                    {canApprove && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy || blockedSelf}
                          onClick={() => onDecide({ disbursement_id: d.id, decision: "approve" })}
                          className="gap-1"
                        >
                          <Check className="w-4 h-4" /> Approve & Post
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy || blockedSelf}
                          onClick={() => {
                            setRejectTarget(d);
                            setReason("");
                          }}
                          className="gap-1"
                        >
                          <X className="w-4 h-4" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(rejectTarget)} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Disbursement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection (min 3 characters)"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={confirmReject}>
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}