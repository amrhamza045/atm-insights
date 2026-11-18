import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useAutoApproveSetting, { APPROVAL_SETTINGS_KEY } from "@/components/approvals/useAutoApproveSetting";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AutoApprovalSetting() {
  const qc = useQueryClient();
  const { record, enabled, isLoading } = useAutoApproveSetting();

  const save = useMutation({
    mutationFn: (value) => record
      ? base44.entities.SystemSettings.update(record.id, { auto_approve_with_permission: value })
      : base44.entities.SystemSettings.create({ setting_key: APPROVAL_SETTINGS_KEY, auto_approve_with_permission: value }),
    onSuccess: (_, value) => {
      qc.invalidateQueries({ queryKey: ["approvalSettings"] });
      toast.success(value ? "Auto-approval turned on" : "Auto-approval turned off");
    },
  });

  return (
    <Card className="p-5 flex items-start justify-between gap-6">
      <div className="space-y-1">
        <h3 className="font-semibold text-slate-900">Auto-approve requests when the requester has approval permission</h3>
        <p className="text-sm text-slate-500">
          When on, a new request is approved automatically if the person who submitted it is allowed to approve that request type. Everyone else's requests stay pending in the Approvals Center.
        </p>
        <p className="text-xs text-slate-400">
          Applies to every request type, including catering payments, deposit withdrawals, quotes, reservations and attendance — the usual "different approver" rule is waived only for requesters who hold the approval permission.
        </p>
        <p className={`text-xs font-medium ${enabled ? "text-emerald-600" : "text-slate-500"}`}>
          {isLoading ? "Loading…" : enabled ? "Currently enabled" : "Currently disabled"}
        </p>
      </div>
      <Switch checked={enabled} disabled={isLoading || save.isPending} onCheckedChange={(v) => save.mutate(v)} />
    </Card>
  );
}