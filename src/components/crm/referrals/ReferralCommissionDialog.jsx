import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import CommissionFields from "./CommissionFields";
import {
  blankCommissionForm, commissionToForm, validateCommission, eventOptions,
  saveCommission, deleteCommission, refreshCommissions,
} from "./commissionApi";

export default function ReferralCommissionDialog({ open, referral, commission, takenEventIds, onOpenChange }) {
  const queryClient = useQueryClient();
  const { currentUser } = usePermissions();
  const [form, setForm] = useState(blankCommissionForm());
  const [saving, setSaving] = useState(false);
  const clientId = referral?.converted_client_id || "";

  useEffect(() => {
    if (open) setForm(commission ? commissionToForm(commission) : blankCommissionForm());
  }, [open, commission]);

  // The referred client's own events once the referral is linked to a client; otherwise every event.
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["referral-commission-events", clientId],
    queryFn: () => clientId
      ? base44.entities.CateringEvent.filter({ client_id: clientId }, "-event_date", 100)
      : base44.entities.CateringEvent.list("-event_date", 300),
    enabled: open,
  });

  const run = async (work, message) => {
    setSaving(true);
    try {
      await work();
      refreshCommissions(queryClient);
      toast.success(message);
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.message || "Could not save the commission");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const error = validateCommission(form);
    if (error) return toast.error(error);
    const event = events.find((e) => e.id === form.event_id);
    run(() => saveCommission({ referral, commission, form, event, userEmail: currentUser?.email }),
      commission ? "Commission updated" : "Commission recorded");
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this commission record?")) return;
    run(() => deleteCommission(commission.id), "Commission deleted");
  };

  if (!referral) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{commission ? "Edit commission" : "Record commission"}</DialogTitle>
          <DialogDescription>
            For {referral.referrer_name || "the referrer"}, who referred {referral.sender_name || "this guest"}.
          </DialogDescription>
        </DialogHeader>
        <CommissionFields form={form} setForm={setForm} options={eventOptions(events, takenEventIds, commission)} eventsLoading={isLoading} />
        <DialogFooter className="gap-2 sm:justify-between">
          {commission ? (
            <Button variant="ghost" className="gap-1 text-red-600 hover:text-red-700" onClick={handleDelete} disabled={saving}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}