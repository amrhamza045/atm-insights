import React from "react";
import { describeAmount, describeDue } from "./paymentPolicyLogic";

/** A saved policy's payment steps as a short timeline. */
export default function PolicyStepList({ steps, mode }) {
  if (!steps.length) return <p className="text-sm text-slate-400">No payment steps.</p>;
  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => (
        <li key={i} className="relative flex items-start gap-3">
          {i < steps.length - 1 && <span aria-hidden="true" className="absolute start-3 top-7 -bottom-2.5 w-px bg-amber-200" />}
          <span className="relative w-6 h-6 rounded-full bg-amber-50 ring-1 ring-amber-200 text-amber-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-medium text-slate-800">
              {describeAmount(step, mode)}
              {step.label && <span className="font-normal text-slate-500"> · {step.label}</span>}
            </p>
            <p className="text-xs text-slate-500">{describeDue(step)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}