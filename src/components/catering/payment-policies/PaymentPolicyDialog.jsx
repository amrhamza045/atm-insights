import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toForm, toRecord, validatePolicy } from "./paymentPolicyLogic";
import PolicyBasicsFields from "./PolicyBasicsFields";
import PolicyRangeFields from "./PolicyRangeFields";
import PaymentStepsEditor from "./PaymentStepsEditor";
import PolicyApprovalFields from "./PolicyApprovalFields";
import SchedulePreview from "./SchedulePreview";

/** Adds or edits one payment policy. */
export default function PaymentPolicyDialog({ open, policy, onOpenChange, onSave }) {
  const [form, setForm] = useState(() => toForm(null));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(toForm(policy));
    setErrors({});
  }, [open, policy]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    const found = validatePolicy(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await onSave(policy?.id, toRecord(form));
      toast.success(policy ? "Policy saved" : "Policy added");
      onOpenChange(false);
    } catch {
      setErrors({ save: "Could not save the policy. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{policy ? "Edit payment policy" : "New payment policy"}</DialogTitle>
          <DialogDescription>Set the booking window, the payment steps and whether these bookings need approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-5">
          <PolicyBasicsFields form={form} set={set} error={errors.name} />
          <PolicyRangeFields form={form} set={set} error={errors.range} />
          <PaymentStepsEditor form={form} set={set} errors={errors} />
          <PolicyApprovalFields form={form} set={set} error={errors.approval} />
          <SchedulePreview form={form} />
          {Object.keys(errors).length > 0 && (
            <p className="text-sm text-red-600">{errors.save || "Fix the messages in red above, then save again."}</p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? "Saving…" : "Save policy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}