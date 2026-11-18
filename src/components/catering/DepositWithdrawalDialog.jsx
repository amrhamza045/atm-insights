import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfiguredPaymentMethodSelect from '@/components/catering/ConfiguredPaymentMethodSelect';
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import PaymentProofUpload from "@/components/catering/PaymentProofUpload";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import useSelfApprovalOpen from "@/components/approvals/useSelfApproval";
import { canSelfApprove } from "@/components/catering/paymentApprovalAccess";


export default function DepositWithdrawalDialog({ open, onOpenChange, event, excess }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  const selfApprove = canSelfApprove(permissions, isAdmin, useSelfApprovalOpen(), "deposit_withdrawal_approve");

  useEffect(() => { if (open) { setAmount(String(excess)); setReference(""); setReceiptUrl(""); } }, [open, excess]);

  const value = Number(amount) || 0;
  const error = value <= 0 ? "Enter an amount" : value > excess ? `Cannot exceed the excess of ${formatCurrency(excess, true)}` : "";
  const partial = !error && value < excess;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke("withdrawCateringDeposit", { event_id: event.id, amount: value, payment_method: method, reference, receipt_url: receiptUrl });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      ]);
      queryClient.invalidateQueries({ queryKey: ["approvals-deposit-withdrawals"] });
      toast.success(`Withdrawal of ${formatCurrency(value, true)} ${data?.auto_approved ? "approved and posted" : "sent for approval"}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not withdraw the deposit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Withdraw excess deposit</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">Required</p><p className="font-semibold">{formatCurrency(event.required_deposit_amount || 0, true)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">Deposit paid</p><p className="font-semibold">{formatCurrency(event.deposit_paid_amount || 0, true)}</p></div>
            <div className="rounded-lg bg-blue-50 p-2"><p className="text-blue-600">Excess</p><p className="font-semibold text-blue-700">{formatCurrency(excess, true)}</p></div>
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Amount</Label>
              <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => setAmount(String(excess))}>Withdraw full excess</button>
            </div>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {error && <p className="text-xs mt-1 text-red-600">{error}</p>}
          </div>
          {partial && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Partial withdrawal — {formatCurrency(excess - value, true)} excess stays on deposit. The event stays confirmed.
            </div>
          )}
          <div>
            <Label>Method</Label>
            <ConfiguredPaymentMethodSelect eventId={event.id} value={method} disabled={saving} onChange={setMethod}/>
          </div>
          <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <PaymentProofUpload value={receiptUrl} onChange={setReceiptUrl} />
          <p className="text-xs text-slate-500">{selfApprove ? "Posted at once" : "Sent to Approvals — nothing is posted until another finance user approves it. Then posted"} against the Catering Deposits liability; revenue is not affected.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !method || !!error}>{partial ? "Request partial withdrawal" : "Request withdrawal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}