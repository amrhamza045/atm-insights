import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { companyToday } from "@/components/utils/timezoneHelper";
import SupplierPaymentFields from "@/components/purchasing/supplierAccounts/SupplierPaymentFields";
import { refreshSupplierAccounts } from "@/components/purchasing/supplierAccounts/supplierAccountApi";
import PaymentProofField from "@/components/purchasing/PaymentProofField";
import { supplierPaymentCall, useSupplierPayable } from "@/components/purchasing/useSupplierPayments";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

const blank = () => ({ amount: "", entry_date: companyToday(), payment_method: "", notes: "" });

export default function SupplierPayDialog({ open, onOpenChange, supplier, branchId, branchName, totalSpent = 0, totalPaid = 0, remaining = 0 }) {
  const [mode, setMode] = useState("full");
  const [payment, setPayment] = useState(blank);
  const [proof, setProof] = useState(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const client = useQueryClient();
  const payableQ = useSupplierPayable(branchId, supplier?.id, open);
  const payable = Number(payableQ.data?.payable || 0);

  useEffect(() => {
    if (!open) return;
    setMode("full");
    setPayment(blank());
    setProof(null);
    setKey(crypto.randomUUID());
  }, [open, supplier?.id]);

  const pay = useMutation({
    mutationFn: () => supplierPaymentCall({
      action: "pay", supplier_id: supplier.id, branch_id: branchId, settlement: mode,
      amount: mode === "full" ? payable : Number(payment.amount), payment_date: payment.entry_date,
      payment_method: payment.payment_method, notes: payment.notes.trim(), idempotency_key: key,
      confirmation_file_uri: proof?.uri || "", confirmation_file_name: proof?.name || "",
    }),
    onSuccess: () => { refreshSupplierAccounts(client); toast.success("Supplier payment recorded"); onOpenChange(false); },
    onError: () => refreshSupplierAccounts(client),
  });

  if (!supplier) return null;
  const scope = { supplier_id: supplier.id, branch_id: branchId };
  const unreviewed = Math.max(0, Math.round((remaining - payable) * 100) / 100);

  return (
    <Dialog open={open} onOpenChange={(v) => !pay.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" />Pay Supplier — {supplier.name}</DialogTitle>
          <DialogDescription>Settle this supplier's open invoices in {branchName || "the selected branch"}. Choose how it is settled.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 border text-center">
            <div><p className="text-[11px] text-slate-500">Total Spent</p><p className="text-xs font-bold">{formatCurrency(totalSpent)}</p></div>
            <div><p className="text-[11px] text-slate-500">Total Paid</p><p className="text-xs font-bold text-emerald-700">{formatCurrency(totalPaid)}</p></div>
            <div><p className="text-[11px] text-slate-500">Remaining</p><p className="text-xs font-bold text-amber-700">{formatCurrency(remaining)}</p></div>
          </div>

          {payableQ.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Loading open invoices…</p>
          ) : (
            <>
              <Label className="block space-y-1">Settlement
                <select className="w-full rounded-md border border-input bg-background p-2 text-sm" disabled={pay.isPending} value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="full">Immediate full payment</option>
                  <option value="partial">Immediate partial payment</option>
                </select>
              </Label>
              <SupplierPaymentFields scope={scope} value={{ ...payment, amount: mode === "full" ? payable : payment.amount }} onChange={setPayment} disabled={pay.isPending} fixedAmount={mode === "full"} max={payable} notesOptional />
              <PaymentProofField value={proof} onChange={setProof} disabled={pay.isPending} />
              {unreviewed > 0 && <p className="text-xs text-amber-700">{formatCurrency(unreviewed)} comes from older invoices not yet registered in Supplier Accounts; review them there before paying that part.</p>}
            </>
          )}

          {(pay.error || payableQ.error) && <p role="alert" className="text-sm text-destructive">{(pay.error || payableQ.error).message}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" disabled={pay.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pay.isPending || payableQ.isLoading || payable <= 0} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {pay.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}Record payment
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Records a payment already made; no bank transfer is initiated.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}