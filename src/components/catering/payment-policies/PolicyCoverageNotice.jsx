import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { coverageIssues } from "./paymentPolicyLogic";

/** Checks that the active policies' booking windows cover every booking exactly once. */
export default function PolicyCoverageNotice({ policies }) {
  const { activeCount, issues } = coverageIssues(policies);
  if (activeCount && !issues.length) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        Every booking, however far ahead, matches exactly one active policy.
      </div>
    );
  }
  const lines = activeCount ? issues : ["Every policy is switched off, so no booking window is covered."];
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" /> Check the booking windows
      </p>
      <ul className="mt-1.5 space-y-1 ps-6 list-disc">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </div>
  );
}