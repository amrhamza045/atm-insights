import React from "react";
import { Coins } from "lucide-react";
import { describeRange } from "./paymentPolicyLogic";
import PolicyStepList from "./PolicyStepList";
import PolicyApprovalSummary from "./PolicyApprovalSummary";

/** A policy's window, payment steps and approval rule, as shown in the booking form. */
export default function PolicySummaryBox({ policy, note }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2.5">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
          <Coins className="w-4 h-4 text-amber-600" /> Payment policy: {policy.name}
        </p>
        <p className="text-xs text-slate-500">{note || describeRange(policy.min_days_before, policy.max_days_before)}</p>
      </div>
      <PolicyStepList steps={policy.schedule || []} mode={policy.amount_mode} />
      <PolicyApprovalSummary policy={policy} />
    </div>
  );
}