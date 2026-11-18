import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import ReceiptLink from "@/components/shared/ReceiptLink";

export const WITHDRAWALS_KEY = ["approvals-deposit-withdrawals"];

export default function DepositWithdrawalQueue() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const { data } = useQuery({
    queryKey: WITHDRAWALS_KEY,
    queryFn: () => base44.entities.CateringPayment.filter({ payment_type: "deposit_withdrawal", status: "pending" }, { sort: "-created_date", limit: 50 }),
  });
  const items = data?.items || [];

  const decide = async (p, decision) => {
    setBusy(p.id);
    try {
      await base44.functions.invoke("approveDepositWithdrawal", { payment_id: p.id, decision, reason });
      toast.success(decision === "approve" ? "Withdrawal approved and posted" : "Withdrawal rejected");
      setRejecting(null); setReason("");
      ["catering-payments", "catering-events"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: WITHDRAWALS_KEY });
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not process the request");
    } finally { setBusy(null); }
  };

  if (!items.length) return null;
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <ArrowDownCircle className="w-5 h-5 text-blue-500" /> Deposit Withdrawals ({items.length})
      </h2>
      <Card className="border-warning-300 bg-warning-50/50">
        <CardContent className="pt-4 divide-y">
          {items.map((p) => (
            <div key={p.id} className="py-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><span className="font-semibold">{p.event_name}</span> · {p.client_name} · {p.payment_method?.replace(/_/g, " ")}{p.reference ? ` · ref ${p.reference}` : ""} · by {p.recorded_by}</span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-red-600">{formatCurrency(p.amount, true)}</span>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" disabled={busy === p.id} onClick={() => decide(p, "approve")}><Check className="w-3 h-3" /> Approve</Button>
                  <Button size="sm" variant="destructive" className="gap-1" disabled={busy === p.id} onClick={() => { setRejecting(p.id); setReason(""); }}><X className="w-3 h-3" /> Reject</Button>
                </span>
              </div>
              {p.notes && <p className="text-xs text-slate-600">{p.notes}</p>}
              {p.receipt_url && <ReceiptLink value={p.receipt_url} className="text-xs text-blue-600 underline">View proof</ReceiptLink>}
              {rejecting === p.id && (
                <div className="flex gap-2">
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason (required)" />
                  <Button size="sm" variant="destructive" disabled={!reason.trim() || busy === p.id} onClick={() => decide(p, "reject")}>Confirm</Button>
                  <Button size="sm" variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}