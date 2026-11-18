import React from "react";
import { CalendarRange, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AMOUNT_MODES, describeRange, policyWarnings } from "./paymentPolicyLogic";
import PolicyStepList from "./PolicyStepList";
import PolicyApprovalSummary from "./PolicyApprovalSummary";
import PolicyWarnings from "./PolicyWarnings";
import DeletePolicyButton from "./DeletePolicyButton";
import ApproverAccessHint from "./ApproverAccessHint";

/** One saved policy: its booking window, payment steps and approval rule. */
export default function PaymentPolicyCard({ policy, canEdit, onEdit, onToggle, onDelete }) {
  const active = policy.is_active !== false;
  const steps = policy.schedule || [];
  const mode = AMOUNT_MODES.find((m) => m.value === (policy.amount_mode || "running_total"));
  const toggle = async (on) => {
    await onToggle(on);
    toast.success(`"${policy.name}" switched ${on ? "on" : "off"}`);
  };

  return (
    <div className={`rounded-xl border bg-white p-4 space-y-4 transition-opacity ${active ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 truncate">{policy.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarRange className="w-4 h-4 flex-shrink-0" />
            {describeRange(policy.min_days_before, policy.max_days_before)}
          </p>
        </div>
        <Switch checked={active} onCheckedChange={toggle} disabled={!canEdit} aria-label="Policy active" className="mt-1" />
        {canEdit && (
          <>
            <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit policy"><Pencil className="w-4 h-4" /></Button>
            <DeletePolicyButton name={policy.name} onConfirm={onDelete} />
          </>
        )}
      </div>
      <PolicyStepList steps={steps} mode={policy.amount_mode} />
      {steps.length > 1 && <p className="text-xs text-slate-400">{mode?.label}: {mode?.hint}</p>}
      <PolicyApprovalSummary policy={policy} />
      {policy.requires_approval && <ApproverAccessHint roleKey={policy.approver_role_key} />}
      <PolicyWarnings warnings={policyWarnings(policy)} />
      {policy.description && <p className="text-sm text-slate-500 border-t pt-3 whitespace-pre-line">{policy.description}</p>}
    </div>
  );
}