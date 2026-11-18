import React from "react";
import { Ban, Check } from "lucide-react";

/** What the payment policy blocks right now, or that nothing is blocked. */
export default function PolicyIssuesNotice({ issues = [] }) {
  if (!issues.length) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-700">
        <Check className="w-3.5 h-3.5" /> The event is in line with its payment policy.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
      <p className="flex items-center gap-1.5 text-sm font-medium text-red-800"><Ban className="w-4 h-4" /> Blocked by the payment policy</p>
      {issues.map((issue) => <p key={issue.code} className="text-xs text-red-700">{issue.message}</p>)}
      <p className="text-xs text-red-700/80">Confirm & Start and stock release stay blocked until this is resolved.</p>
    </div>
  );
}