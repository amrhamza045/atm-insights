import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { logEventAudit } from "./eventAudit";
import { releaseForEvent } from "./productionPlanning";
import { releaseEventStaffing } from "./staffing";
import { releaseEquipmentForEvent } from "./equipmentLogic";
import { cancelTripsForEvent } from "./logisticsLogic";
import CancellationSettlement from "./cancellation/CancellationSettlement";

const REFRESH = ["catering-events", "catering-payments", "catering-payment-approvals", "catering-reservations", "catering-production", "catering-assignments", "catering-equipment-reservations", "catering-trips", "kitchen-release-slips"];

export default function CancelEventDialog({ open, onOpenChange, event }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const planQuery = useQuery({
    queryKey: ["catering-cancellation-plan", event?.id],
    queryFn: async () => (await base44.functions.invoke("cateringCancellation", { action: "plan", event_id: event.id })).data.plan,
    enabled: open && !!event?.id,
  });
  const plan = planQuery.data;

  const refresh = async () => {
    await planQuery.refetch();
    REFRESH.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const handleCancel = async () => {
    setSaving(true);
    try {
      const { data } = await base44.functions.invoke("cateringCancellation", { action: "finalize", event_id: event.id, reason });
      const user = await base44.auth.me();
      const why = `Event cancelled: ${reason || "no reason given"}`;
      logEventAudit("update", event, `Cancelled event: ${reason || "no reason given"}`, {
        status: { from: event.status, to: "cancelled" },
        cancellation_penalty_amount: { from: null, to: data.plan.fee_amount },
      });
      await releaseForEvent({ event, userEmail: user?.email || "", reason: why });
      await releaseEventStaffing({ eventId: event.id, userEmail: user?.email || "", reason: why });
      await releaseEquipmentForEvent({ eventId: event.id, userEmail: user?.email || "", reason: why });
      await cancelTripsForEvent({ eventId: event.id, reason: why });
      await refresh();
      toast.success("Event cancelled — stock and production released for manager review");
      onOpenChange(false);
      setReason("");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not cancel the event");
      planQuery.refetch();
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cancel “{event.event_name}”</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {planQuery.isLoading ? (
            <p className="text-slate-500">Working out the cancellation fee…</p>
          ) : planQuery.isError ? (
            <p className="text-red-600">{planQuery.error?.response?.data?.error || "Could not load the cancellation fee."}</p>
          ) : plan && (
            <CancellationSettlement event={event} plan={plan} onChanged={refresh} />
          )}
          <p className="text-slate-600">Reserved stock, production inputs and any unstarted production batches are released and flagged for manager review.</p>
          <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep event</Button>
          <Button variant="destructive" onClick={handleCancel} disabled={saving || !plan?.ready}>Cancel event</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}