import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { usePaymentPolicies } from "./usePaymentPolicies";
import PaymentPoliciesHeader from "./PaymentPoliciesHeader";
import PaymentPoliciesEmpty from "./PaymentPoliciesEmpty";
import PolicyCoverageNotice from "./PolicyCoverageNotice";
import PaymentPolicyCard from "./PaymentPolicyCard";
import PaymentPolicyDialog from "./PaymentPolicyDialog";

/** Catering › Settings › Payment Policies: payment rules by how far ahead an event is booked. */
export default function PaymentPoliciesTab() {
  const { permissions } = usePermissions();
  const canEdit = permissions?.catering_settings_edit === true;
  const { policies, isLoading, save, remove } = usePaymentPolicies();
  // null = editor closed, {} = new policy, a record = editing that policy.
  const [editing, setEditing] = useState(null);
  const openNew = () => setEditing({});

  return (
    <div className="space-y-4">
      <PaymentPoliciesHeader canEdit={canEdit} onAdd={openNew} />
      {!canEdit && (
        <p className="text-sm text-slate-500">These policies are read-only. Changing them needs the Edit Catering Settings permission.</p>
      )}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : policies.length === 0 ? (
        <PaymentPoliciesEmpty canEdit={canEdit} onAdd={openNew} />
      ) : (
        <>
          <PolicyCoverageNotice policies={policies} />
          <div className="grid gap-3 lg:grid-cols-2">
            {policies.map((policy) => (
              <PaymentPolicyCard
                key={policy.id}
                policy={policy}
                canEdit={canEdit}
                onEdit={() => setEditing(policy)}
                onToggle={(on) => save(policy.id, { is_active: on })}
                onDelete={() => remove(policy.id)}
              />
            ))}
          </div>
        </>
      )}
      <PaymentPolicyDialog
        open={editing !== null}
        policy={editing?.id ? editing : null}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        onSave={save}
      />
    </div>
  );
}