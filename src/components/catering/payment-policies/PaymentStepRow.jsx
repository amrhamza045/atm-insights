import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AMOUNT_TYPES, DUE_TYPES } from "./paymentPolicyLogic";
import PolicySelect from "./PolicySelect";

/** One payment step: how much, and when it's due. */
export default function PaymentStepRow({ index, step, onChange, onRemove, error }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">{index + 1}</span>
        <Input value={step.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="Step name (optional)" className="h-8 bg-white" />
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove payment ${index + 1}`}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Amount</Label>
          <div className="flex gap-2">
            {step.amount_type !== "balance" && (
              <Input type="number" min="0" step="any" value={step.amount} onChange={(e) => onChange({ amount: e.target.value })} className="w-28 flex-shrink-0 bg-white" aria-label="Amount" />
            )}
            <PolicySelect value={step.amount_type} options={AMOUNT_TYPES} onChange={(v) => onChange({ amount_type: v })} label="Amount type" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Due</Label>
          <div className="flex gap-2">
            {step.due_type !== "booking_day" && (
              <Input type="number" min="0" step="1" value={step.due_days} onChange={(e) => onChange({ due_days: e.target.value })} className="w-20 flex-shrink-0 bg-white" aria-label="Days" />
            )}
            <PolicySelect value={step.due_type} options={DUE_TYPES} onChange={(v) => onChange({ due_type: v })} label="Due" />
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}