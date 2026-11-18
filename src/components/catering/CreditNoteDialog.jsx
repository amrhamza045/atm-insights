import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DepositFloorWarning from "@/components/catering/DepositFloorWarning";
import PaymentProofUpload from "@/components/catering/PaymentProofUpload";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import useSelfApprovalOpen from "@/components/approvals/useSelfApproval";
import { canSelfApprove } from "@/components/catering/paymentApprovalAccess";
import ConfiguredPaymentMethodSelect from '@/components/catering/ConfiguredPaymentMethodSelect';


export default function CreditNoteDialog({ open, onOpenChange, event }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [method, setMethod] = useState('');
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  const selfApprove = canSelfApprove(permissions, isAdmin, useSelfApprovalOpen());

  if (!event) return null;
  const available = Math.max(0, Number(event.deposit_paid_amount) || 0);
  const overCap = available <= 0 || (Number(amount) || 0) > available;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke("issueCateringCreditNote", {
        event_id: event.id, amount: Number(amount) || 0, payment_method: method, reason, confirm_underfunding: !!warning && confirmed, receipt_url: receiptUrl,
      });
      if (data.warning) { setWarning(data); setConfirmed(false); return; }
      const { number, demoted } = data;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-profitability"] }),
      ]);
      toast.success(data.pending ? `Credit note ${number} submitted for approval; balances are unchanged` : `Credit note ${number} issued and posted to the ledger`);
      queryClient.invalidateQueries({ queryKey: ['catering-payment-approvals'] });
      if (demoted) toast.warning("Deposit is now below the required amount — event moved back to deposit pending");
      setAmount(""); setReason(""); setReceiptUrl(""); setWarning(null); setConfirmed(false);
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Could not issue the credit note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Issue credit note — {event.event_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Available to refund from deposits: <span className="font-semibold">{available.toLocaleString("en-US", { minimumFractionDigits: 2 })} EGP</span></p>
          <div><Label>Amount to credit</Label><Input type="number" min="0" max={available} value={amount} onChange={(e) => { setAmount(e.target.value); setWarning(null); }} />
            {overCap && <p className="text-xs text-red-600 mt-1">{available <= 0 ? "There is no deposit on this event to refund." : "Amount exceeds the refundable deposit."}</p>}
          </div>
          <div><Label>Reason</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancellation refund, billing correction…" /></div>
          <div><Label>Refund payment method</Label><ConfiguredPaymentMethodSelect eventId={event.id} value={method} disabled={saving} onChange={setMethod}/></div>
          <PaymentProofUpload value={receiptUrl} onChange={setReceiptUrl} />
          <p className="text-xs text-slate-500">
            {selfApprove
              ? "Posted at once against Catering Deposits, without changing revenue."
              : "Submitted as a catering refund for independent approval; only approved credit notes post against Catering Deposits, without changing revenue."}
          </p>
          {warning && <DepositFloorWarning warning={warning} confirmed={confirmed} onConfirmedChange={setConfirmed} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !method || overCap || !(Number(amount) > 0) || (!!warning && !confirmed)}>{selfApprove ? "Issue credit note" : "Submit credit note for approval"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}