import React, { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { round2 } from "./cateringLogic";
import { useBranch } from "@/components/branches/BranchContext";
import useEventServiceTotals from "./useEventServiceTotals";
import PaymentProofUpload from "./PaymentProofUpload";
import DepositFloorWarning from "./DepositFloorWarning";
import DepositPercentField from "./DepositPercentField";
import { depositMinimum } from "./depositMinimum";
import { eventTotal } from "./serviceBilling";
import { autoApproveReservation } from "./autoApproveReservation";
import { autoStartOperations, OPERATIONS_QUERY_KEYS } from "./confirm/autoStartOperations";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import useSelfApprovalOpen from "@/components/approvals/useSelfApproval";
import { canSelfApprove } from "./paymentApprovalAccess";
import ConfiguredPaymentMethodSelect from '@/components/catering/ConfiguredPaymentMethodSelect';

const blankForm = { payment_type: "deposit", amount: "", payment_method: "", reference: "", receipt_url: "" };

// The payment submission fields + submit logic, shared by the Payments tab and the Record Deposit quick action.
export default function PaymentEntryForm({ event, onDone, onCancel }) {
  const queryClient = useQueryClient();
  const { selectedBranch } = useBranch();
  // null = the % box's starting value (see depositMinimum).
  const [depositPct, setDepositPct] = useState(null);
  // Until the Amount box is typed in, a deposit's amount follows its minimum; typing can raise it, never lower it.
  const [amountTyped, setAmountTyped] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  // Locks at the first click (state only locks after a redraw); the one-time ID lets the server refuse a repeat.
  const savingRef = useRef(false);
  const requestIdRef = useRef(crypto.randomUUID());
  const [floorWarning, setFloorWarning] = useState(null);
  const [underfundOk, setUnderfundOk] = useState(false);
  const service = useEventServiceTotals(event?.id);
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  const selfApprove = canSelfApprove(permissions, isAdmin, useSelfApprovalOpen());

  const grandTotal = eventTotal(event, service.total);
  const outstanding = round2(Math.max(0, grandTotal - (event.total_paid || 0)));
  const isDeposit = form.payment_type === "deposit";
  const deposit = depositMinimum(event, { grandTotal, outstanding, pct: depositPct });
  const minDeposit = isDeposit ? deposit.minimum : 0;
  const policyBinding = deposit.policyFloor > 0 && deposit.policyFloor >= deposit.pctAmount;
  const effectiveAmount = isDeposit && !amountTyped ? minDeposit : form.amount;
  const enteredAmount = Number(effectiveAmount) || 0;
  // Refunds and penalties both come off what the client has paid (a penalty is kept from the deposit).
  const takesFromPaid = form.payment_type === "refund" || form.payment_type === "penalty";
  const amountError =
    takesFromPaid
      ? enteredAmount > (event.total_paid || 0) ? `${form.payment_type === "refund" ? "Refund" : "A penalty is kept from the deposit, so it"} cannot exceed the ${formatCurrency(event.total_paid || 0, true)} paid so far` : ""
      : ["deposit", "final_balance", "additional"].includes(form.payment_type) && enteredAmount > outstanding
        ? grandTotal <= 0
          ? "This event has no total yet — create a quote before recording payments"
          : `Amount exceeds the outstanding balance of ${formatCurrency(outstanding, true)} (event total ${formatCurrency(grandTotal, true)})`
        : isDeposit && enteredAmount < deposit.policyFloor
          ? `The "${deposit.policyName}" payment policy needs at least ${formatCurrency(deposit.policyFloor, true)} in this deposit to complete its first payment`
          : isDeposit && enteredAmount < deposit.pctAmount
            ? `A ${deposit.percent}% deposit must be at least ${formatCurrency(deposit.pctAmount, true)} — lower the % for a smaller deposit`
            : "";

  const handleSave = async () => {
    if (savingRef.current) return;
    const amount = enteredAmount;
    if (amount <= 0) { toast.error("Enter an amount"); return; }
    if (amountError) { toast.error(amountError); return; }
    savingRef.current = true;
    setSaving(true);
    try {
      // Approved at once when the submitter holds Catering Payment Approval; otherwise pending for another approver.
      const { data } = await base44.functions.invoke("recordCateringPayment", {
        event_id: event.id,
        payment_type: form.payment_type,
        amount,
        payment_method: form.payment_method,
        reference: form.reference,
        receipt_url: form.receipt_url || "",
        deposit_percent: isDeposit ? Number(deposit.percent) || 0 : undefined,
        confirm_underfunding: underfundOk,
        client_request_id: requestIdRef.current,
      });
      if (data.warning === "below_deposit_floor") {
        setFloorWarning(data);
        setUnderfundOk(false);
        return;
      }
      setFloorWarning(null);
      setUnderfundOk(false);
      const queuesReservation = data.queuesReservation;

      if (data.auto_approved) {
        toast.success("Payment auto-approved");
        const reserved = queuesReservation && await autoApproveReservation(event.id, selectedBranch);
        if (reserved) toast.success("Reservation auto-approved");
        else if (queuesReservation) toast.message("Deposit received — the reservation is now awaiting manager approval");
        const started = await autoStartOperations(event.id);
        if (started) toast.success("Operations started automatically — the event is now in active planning.");
        OPERATIONS_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      } else if (queuesReservation) {
        toast.message("Deposit received — the reservation is now awaiting manager approval");
      }

      // Emails are sent by the server action; just report the outcome.
      const res = data.notifications || {};
      if (res.sent) toast.message(`Payment emails submitted (${res.sent} recipients)`);
      if (res.customer_sent === false) toast.error("Payment saved, but the customer email could not be sent");
      else if (res.failed) toast.error(`Payment saved, but ${res.failed} email(s) could not be sent`);
      (res.warnings || []).forEach((warning) => toast.warning(warning));

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-reservations"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-production"] }),
      ]);
      toast.success(data.pending ? "Payment submitted for approval; balances are unchanged" : "Payment recorded");
      queryClient.invalidateQueries({ queryKey: ['catering-payment-approvals'] });
      requestIdRef.current = crypto.randomUUID();
      setForm(blankForm);
      setDepositPct(null);
      setAmountTyped(false);
      onDone?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not record the payment");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div>
          <Label>Type</Label>
          <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="final_balance">Final balance</SelectItem>
              <SelectItem value="additional">Additional</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="penalty">Cancellation penalty</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.payment_type === "deposit" && (
          <DepositPercentField paidAmount={event.total_paid || 0} requiredAmount={event.payment_policy_id ? Number(event.required_deposit_amount) || 0 : round2(grandTotal * (event.deposit_percentage ?? 50) / 100)} requiredPct={event.payment_policy_id ? (grandTotal > 0 ? round2(((Number(event.required_deposit_amount) || 0) / grandTotal) * 100) : 0) : event.deposit_percentage ?? 50} paidPct={grandTotal > 0 ? round2(((event.total_paid || 0) / grandTotal) * 100) : 0} value={deposit.percent} onChange={(pct) => { setDepositPct(pct); setAmountTyped(false); }} />
        )}
        <div><Label>Amount</Label><Input type="number" inputMode="decimal" min={minDeposit} value={effectiveAmount} onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }} onPaste={(e) => { if (!/^\d*\.?\d*$/.test(e.clipboardData.getData("text").trim())) e.preventDefault(); }} onChange={(e) => { setForm({ ...form, amount: e.target.value }); setAmountTyped(true); }} />
          <p className={`text-xs mt-1 ${amountError ? "text-red-600" : "text-slate-500"}`}>
            {amountError || `${isDeposit ? `Minimum: ${formatCurrency(minDeposit, true)}${policyBinding ? `, set by the "${deposit.policyName}" payment policy` : ""} · ` : ""}Outstanding balance: ${formatCurrency(outstanding, true)}`}
          </p>
          {form.payment_type === "deposit" && (
            <p className="text-xs mt-1 text-amber-700">
              Remaining to start operations: {formatCurrency(round2(Math.max(0, (event.required_deposit_amount || 0) - (event.deposit_paid_amount || 0) - enteredAmount)), true)}
            </p>
          )}
        </div>
        <div>
          <Label>Method</Label>
          <ConfiguredPaymentMethodSelect eventId={event.id} value={form.payment_method} disabled={saving} onChange={payment_method=>setForm({...form,payment_method})}/>
        </div>
        <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
        <PaymentProofUpload value={form.receipt_url} onChange={(url) => setForm({ ...form, receipt_url: url })} />
        {floorWarning && takesFromPaid && (
          <DepositFloorWarning warning={floorWarning} confirmed={underfundOk} onConfirmedChange={setUnderfundOk} actionLabel={form.payment_type === "refund" ? "record the refund" : "keep the penalty from the deposit"} />
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving || !form.payment_method || !!amountError || (!!floorWarning && takesFromPaid && !underfundOk)}>{selfApprove ? "Record payment" : "Submit for approval"}</Button>
      </DialogFooter>
    </>
  );
}