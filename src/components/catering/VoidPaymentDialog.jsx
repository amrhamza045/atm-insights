import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function VoidPaymentDialog({ payment, event, onClose }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return toast.error("Enter a reason for voiding");
    setSaving(true);
    try {
      const { data: res } = await base44.functions.invoke("voidCateringPayment", { payment_id: payment.id, reason: reason.trim() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      ]);
      toast.success("Payment voided and ledger reversed");
      if (event.status === "confirmed" && res.depositStatus !== "paid") {
        toast.message("Deposit no longer covered — event moved back to deposit pending. Review any stock reservations.");
      }
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not void the payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Void payment</DialogTitle></DialogHeader>
        {payment && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Voids the {payment.payment_type.replace(/_/g, " ")} of {formatCurrency(payment.amount, true)} as entered in error. It is kept for the audit trail but removed from all totals, and its ledger entry is reversed. No refund is recorded.
            </p>
            <div>
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong amount typed" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>{saving ? "Voiding…" : "Void payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}