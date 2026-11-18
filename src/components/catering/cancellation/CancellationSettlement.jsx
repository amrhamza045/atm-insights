import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { round2 } from "../cateringLogic";
import ConfiguredPaymentMethodSelect from "@/components/catering/ConfiguredPaymentMethodSelect";

const money = (n) => formatCurrency(n || 0, true);

function outcomeText(plan) {
  if (plan.fee_left <= 0) return plan.credit > 0 ? `Fee settled. Refund the remaining ${money(plan.credit)} to the customer.` : "Nothing left to settle.";
  const surplus = round2(plan.credit - plan.fee_left);
  if (surplus >= 0) return `The deposit covers the fee: keep ${money(plan.fee_left)}${surplus > 0 ? `, then refund ${money(surplus)}` : ""}.`;
  return `The deposit falls short: collect ${money(-surplus)}, then keep the full ${money(plan.fee_left)} fee.`;
}

// Fee against the deposit first, then a collection or refund through the chosen payment method.
export default function CancellationSettlement({ event, plan, onChanged }) {
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const settle = async () => {
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke("cateringCancellation", { action: "settle", event_id: event.id, payment_method: method, reference });
      toast[data.plan.pending.length ? "message" : "success"](data.plan.pending.length ? "Submitted for approval. Finish cancelling once it is approved in the Approvals Center." : "Cancellation settlement recorded");
      await onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not submit the settlement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1 text-slate-700">
        <p>Policy: <span className="font-medium">{plan.policy_name || "No policy configured, 0% fee"}</span> · {plan.days} day(s) before the event</p>
        <p>Cancellation fee: <span className="font-semibold">{plan.fee_percentage}% of {money(plan.fee_base)} = {money(plan.fee_amount)}</span></p>
        <p>Paid by the customer: <span className="font-medium">{money(plan.credit)}</span>{plan.fee_kept > 0 && <> · fee already kept: {money(plan.fee_kept)}</>}</p>
        <p className="font-medium text-amber-900">{outcomeText(plan)}</p>
      </div>

      {plan.pending.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">
          <Clock className="w-4 h-4 mt-0.5 text-slate-500" />
          <span>{plan.pending.length} payment(s) on this event await approval in the <Link to="/Approvals" className="underline font-medium">Approvals Center</Link>. Cancelling continues once they are decided.</span>
        </p>
      )}

      {plan.next && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-3">
          <p className="font-medium text-slate-900">Next: {plan.next.label} · {money(plan.next.amount)}</p>
          <div>
            <Label>Payment method</Label>
            <ConfiguredPaymentMethodSelect eventId={event.id} value={method} disabled={saving} onChange={setMethod} />
          </div>
          <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <Button className="w-full" onClick={settle} disabled={saving || !method}>{saving ? "Submitting…" : "Submit settlement"}</Button>
        </div>
      )}

      {plan.ready && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
          <CheckCircle2 className="w-4 h-4" /> Settled: nothing is owed either way. The event can be cancelled.
        </p>
      )}
    </div>
  );
}