import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AMOUNT_MODES, emptyStep } from "./paymentPolicyLogic";
import PolicySection from "./PolicySection";
import PolicySelect from "./PolicySelect";
import PaymentStepRow from "./PaymentStepRow";

/** The ordered payment steps and how their amounts add up. */
export default function PaymentStepsEditor({ form, set, errors }) {
  const steps = form.schedule;
  const update = (i, patch) => set({ schedule: steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const mode = AMOUNT_MODES.find((m) => m.value === form.amount_mode);

  return (
    <PolicySection title="Payment schedule" hint="The payments the client makes, in the order they fall due.">
      <div className="space-y-1.5">
        <Label>How the amounts add up</Label>
        <PolicySelect
          value={form.amount_mode}
          options={AMOUNT_MODES}
          onChange={(v) => set({ amount_mode: v })}
          label="How the amounts add up"
          className="sm:w-64"
        />
        <p className="text-xs text-slate-500">{mode?.hint}</p>
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <PaymentStepRow
            key={step.uid}
            index={i}
            step={step}
            error={errors[`step:${step.uid}`]}
            onChange={(patch) => update(i, patch)}
            onRemove={() => set({ schedule: steps.filter((_, j) => j !== i) })}
          />
        ))}
      </div>
      {errors.schedule && <p className="text-xs text-red-600">{errors.schedule}</p>}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => set({ schedule: [...steps, emptyStep()] })}>
        <Plus className="w-4 h-4" /> Add payment step
      </Button>
    </PolicySection>
  );
}