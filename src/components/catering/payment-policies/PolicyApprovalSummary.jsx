import React from "react";
import { ShieldCheck } from "lucide-react";
import { useRoleLabels } from "@/components/admin/users/useRoleOptions";

/** The approval rule of a saved policy, in plain words. */
export default function PolicyApprovalSummary({ policy }) {
  const roleLabels = useRoleLabels();
  if (!policy.requires_approval) return <p className="text-xs text-slate-500">No approval needed.</p>;
  const approver = roleLabels[policy.approver_role_key] || policy.approver_role_key;
  const details = [
    policy.approval_status_label && `Shows "${policy.approval_status_label}" while waiting`,
    policy.hold_until_approved ? "The event is on hold until approved" : "The event can carry on while it waits",
  ].filter(Boolean);

  return (
    <div className="rounded-lg bg-violet-50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-violet-900">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" /> Needs approval by {approver}
      </p>
      <p className="mt-0.5 text-xs text-violet-700">{details.join(" · ")}</p>
    </div>
  );
}