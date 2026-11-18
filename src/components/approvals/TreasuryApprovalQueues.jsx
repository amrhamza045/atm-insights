import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Receipt, Check, X } from "lucide-react";
import { toast } from "sonner";
import { treasuryCall, treasuryError, formatMoney } from "@/components/treasury/treasuryApi";

export function usePendingTreasuryApprovals(enabled = true) {
  return useQuery({
    queryKey: ["treasury", "pending-approvals"],
    queryFn: () => treasuryCall({ action: "pending_approvals" }),
    enabled,
  });
}

export function CustodyApprovalQueue({ items = [], currentUserEmail, selfBypass }) {
  const qc = useQueryClient();
  const [rejectItem, setRejectItem] = useState(null);
  const [reason, setReason] = useState("");

  const mutate = useMutation({
    mutationFn: (payload) => treasuryCall({ action: "custody_request_decide", ...payload }),
    onSuccess: () => {
      toast.success("Custody request updated");
      qc.invalidateQueries({ queryKey: ["treasury"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      setRejectItem(null);
      setReason("");
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-purple-600" /> Petty Cash & Custody Requests ({items.length})
      </h2>
      <div className="space-y-3">
        {items.map((r) => {
          const isOwn = String(r.requested_by || "").toLowerCase() === String(currentUserEmail || "").toLowerCase();
          const blockedSelf = isOwn && !selfBypass;
          return (
            <Card key={r.id} className="border-warning-300 bg-warning-50/50">
              <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge>{r.request_type}</Badge>
                    <span className="font-semibold">{r.employee_name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.entry_date}
                    {r.payment_method_name ? ` · ${r.payment_method_name}` : ""}
                    {` · Requested by ${r.requested_by}`}
                  </p>
                  {r.notes && <p className="text-sm">{r.notes}</p>}
                  {blockedSelf && (
                    <p className="text-xs text-warning-800">Requires a second approver in System Role Groups.</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold">{formatMoney(r.currency, r.amount)}</p>
                  <Button
                    size="sm"
                    disabled={mutate.isPending || blockedSelf}
                    onClick={() =>
                      mutate.mutate({ company_id: r.company_id, request_id: r.id, decision: "approve" })
                    }
                    className="gap-1"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={mutate.isPending || blockedSelf}
                    onClick={() => {
                      setRejectItem(r);
                      setReason("");
                    }}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(rejectItem)} onOpenChange={() => setRejectItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Custody Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectItem(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={mutate.isPending || reason.trim().length < 3}
                onClick={() =>
                  mutate.mutate({
                    company_id: rejectItem.company_id,
                    request_id: rejectItem.id,
                    decision: "reject",
                    rejection_reason: reason,
                  })
                }
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ExpenseDisbursementApprovalQueue({ items = [], currentUserEmail, selfBypass }) {
  const qc = useQueryClient();
  const [rejectItem, setRejectItem] = useState(null);
  const [reason, setReason] = useState("");

  const mutate = useMutation({
    mutationFn: (payload) => treasuryCall({ action: "expense_disbursement_decide", ...payload }),
    onSuccess: () => {
      toast.success("Disbursement updated");
      qc.invalidateQueries({ queryKey: ["treasury"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      setRejectItem(null);
      setReason("");
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-red-600" /> Treasury Expense & Vendor Disbursements ({items.length})
      </h2>
      <div className="space-y-3">
        {items.map((d) => {
          const isOwn = String(d.requested_by || "").toLowerCase() === String(currentUserEmail || "").toLowerCase();
          const blockedSelf = isOwn && !selfBypass;
          return (
            <Card key={d.id} className="border-warning-300 bg-warning-50/50">
              <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>
                      {d.disbursement_kind === "vendor_payment" ? "Vendor Payment" : "Operating Expense"}
                    </Badge>
                    <span className="font-semibold">
                      {d.disbursement_kind === "vendor_payment" ? d.supplier_name : d.expense_type_name}
                    </span>
                    <Badge variant="outline">
                      {d.source_type === "custody"
                        ? `Custody · ${d.custody_holder_name}`
                        : `Method · ${d.payment_method_name || d.payment_method}`}
                    </Badge>
                  </div>
                  <p className="text-sm">{d.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.entry_date} · Requested by {d.requested_by}
                  </p>
                  {blockedSelf && (
                    <p className="text-xs text-warning-800">Requires a second approver in System Role Groups.</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xl font-bold">{formatMoney(d.currency, d.amount)}</p>
                  <Button
                    size="sm"
                    disabled={mutate.isPending || blockedSelf}
                    onClick={() =>
                      mutate.mutate({ company_id: d.company_id, disbursement_id: d.id, decision: "approve" })
                    }
                    className="gap-1"
                  >
                    <Check className="w-4 h-4" /> Approve & Post
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={mutate.isPending || blockedSelf}
                    onClick={() => {
                      setRejectItem(d);
                      setReason("");
                    }}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(rejectItem)} onOpenChange={() => setRejectItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Disbursement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectItem(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={mutate.isPending || reason.trim().length < 3}
                onClick={() =>
                  mutate.mutate({
                    company_id: rejectItem.company_id,
                    disbursement_id: rejectItem.id,
                    decision: "reject",
                    rejection_reason: reason,
                  })
                }
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}