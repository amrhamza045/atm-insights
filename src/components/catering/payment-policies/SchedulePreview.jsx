import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { describeDue, policyWarnings, scheduleBreakdown } from "./paymentPolicyLogic";
import PolicySection from "./PolicySection";
import PolicyWarnings from "./PolicyWarnings";

/** Works the schedule out on a sample quote total, so the owner sees what each step asks for. */
export default function SchedulePreview({ form }) {
  const [sample, setSample] = useState("100000");
  const quote = Math.max(0, Number(sample) || 0);
  const { steps, unpaid } = scheduleBreakdown(form, quote);
  const warnings = [
    ...policyWarnings(form),
    ...steps.flatMap((s, i) => [
      s.capped ? `On this quote, payment ${i + 1} asks for more than the quote total, so it stops at the total.` : null,
      quote > 0 && s.due === 0 ? `On this quote, payment ${i + 1} adds nothing.` : null,
    ]).filter(Boolean),
  ];

  return (
    <PolicySection title="Preview" hint="Try the schedule on a sample quote. Nothing here is saved.">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <span>For a quote of</span>
        <Input type="number" min="0" step="any" value={sample} onChange={(e) => setSample(e.target.value)} className="w-36" aria-label="Sample quote total" />
        <span>EGP</span>
      </div>
      {form.schedule.length > 0 && (
        <div className="rounded-lg border divide-y bg-white">
          {form.schedule.map((step, i) => (
            <div key={step.uid} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 text-sm text-slate-600">{i + 1}. {describeDue(step)}</span>
              <span className="flex-shrink-0 text-end">
                <span className="block text-sm font-medium text-slate-900">{formatCurrency(steps[i].due)}</span>
                <span className="block text-xs text-slate-400">Total paid {formatCurrency(steps[i].paidSoFar)}</span>
              </span>
            </div>
          ))}
          {unpaid > 0.005 && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-amber-50 text-sm text-amber-900">
              <span>Left with no due date</span>
              <span className="font-medium">{formatCurrency(unpaid)}</span>
            </div>
          )}
        </div>
      )}
      <PolicyWarnings warnings={warnings} />
    </PolicySection>
  );
}