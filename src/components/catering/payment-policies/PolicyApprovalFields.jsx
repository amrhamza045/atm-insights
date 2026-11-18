import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoleOptions } from "@/components/admin/users/useRoleOptions";
import PolicySection from "./PolicySection";
import PolicySelect from "./PolicySelect";
import PolicyToggleRow from "./PolicyToggleRow";
import ApproverAccessHint from "./ApproverAccessHint";

/** Whether bookings in the window need approval, by whom, and what happens meanwhile. */
export default function PolicyApprovalFields({ form, set, error }) {
  const { roleOptions } = useRoleOptions();

  return (
    <PolicySection title="Approval" hint="Whether bookings in this window need someone's sign-off before they go ahead.">
      <PolicyToggleRow
        title="Needs approval"
        hint="The booking waits for the approver."
        checked={form.requires_approval}
        onChange={(on) => set({ requires_approval: on })}
      />
      {form.requires_approval && (
        <div className="space-y-4 rounded-lg border bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Approved by</Label>
              <PolicySelect value={form.approver_role_key} options={roleOptions} onChange={(v) => set({ approver_role_key: v })} label="Approved by" placeholder="Choose a role" />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <ApproverAccessHint roleKey={form.approver_role_key} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="approval-status">Status shown while waiting</Label>
              <Input id="approval-status" className="bg-white" value={form.approval_status_label} onChange={(e) => set({ approval_status_label: e.target.value })} placeholder="e.g. Pending approval" />
            </div>
          </div>
          <PolicyToggleRow
            title="Hold the event until it's approved"
            hint="Nothing moves forward (confirmation, operations) before the approver says yes."
            checked={form.hold_until_approved}
            onChange={(on) => set({ hold_until_approved: on })}
          />
        </div>
      )}
    </PolicySection>
  );
}