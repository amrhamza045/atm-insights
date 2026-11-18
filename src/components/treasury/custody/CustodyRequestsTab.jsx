import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { formatMoney } from "@/components/treasury/treasuryApi";

const TYPE_LABELS = {
  issue: "New Custody Issue",
  replenishment: "Replenishment",
  settlement: "Settlement / Return",
};

export default function CustodyRequestsTab({
  requests = [],
  currency = "EGP",
  canApprove,
  selfBypass,
  currentUserEmail,
  onDecide,
  busy,
}) {
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState("");

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  const confirmReject = () => {
    if (!rejectTarget) return;
    onDecide({ request_id: rejectTarget.id, decision: "reject", rejection_reason: reason }, () => {
      setRejectTarget(null);
      setReason("");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Pending Role Group Approvals ({pending.length})</h2>
        <p className="text-xs text-muted-foreground">
          Custody issues, replenishments, and settlements require approval by an authorized System Role Group holder.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No pending custody requests awaiting approval.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => {
            const isOwn =
              String(r.requested_by || "").toLowerCase() === String(currentUserEmail || "").toLowerCase();
            const blockedSelf = isOwn && !selfBypass;
            return (
              <Card key={r.id} className="border-warning-300 bg-warning-50/40">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{TYPE_LABELS[r.request_type] || r.request_type}</Badge>
                      <span className="font-semibold">{r.employee_name}</span>
                      {r.close_after_return && <Badge variant="outline">Closes Custody</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Date: {r.entry_date}
                      {r.payment_method_name ? ` · Method: ${r.payment_method_name}` : ""}
                      {` · Requested by ${r.requested_by}`}
                    </p>
                    {r.notes && <p className="text-sm">{r.notes}</p>}
                    {canApprove && blockedSelf && (
                      <p className="text-xs text-warning-800">
                        Awaiting a second approver in System Role Groups (you submitted this request).
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-bold">{formatMoney(r.currency || currency, r.amount)}</p>
                    {canApprove && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy || blockedSelf}
                          onClick={() => onDecide({ request_id: r.id, decision: "approve" })}
                          className="gap-1"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy || blockedSelf}
                          onClick={() => {
                            setRejectTarget(r);
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

      <div className="space-y-3">
        <h3 className="font-semibold">Recent Request History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-lg p-6 text-center bg-background">
            No processed custody requests yet.
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 border-b text-left">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Staff Member</th>
                  <th className="px-3 py-2.5 font-medium">Payment Method</th>
                  <th className="px-3 py-2.5 font-medium text-right">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Decided By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5 whitespace-nowrap">{r.entry_date}</td>
                    <td className="px-3 py-2.5">{TYPE_LABELS[r.request_type] || r.request_type}</td>
                    <td className="px-3 py-2.5 font-medium">{r.employee_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.payment_method_name || "—"}</td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {formatMoney(r.currency || currency, r.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={r.status === "approved" ? "default" : "destructive"}>{r.status}</Badge>
                      {r.rejection_reason && (
                        <p className="text-xs text-destructive mt-0.5">{r.rejection_reason}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.decided_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Custody Request</DialogTitle>
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