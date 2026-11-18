import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import EventScopeNotice from "./EventScopeNotice";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import AdditionalChargesEditor from "./AdditionalChargesEditor";
import EventCostMarginCard from "./EventCostMarginCard";
import ActualCostsRecomputeButton from '@/components/catering/ActualCostsRecomputeButton';
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { canFinalizeReconciliation } from "./cateringGuards";
import { useSelfApprovalBypass } from "@/components/approvals/useSelfApproval";
import { logAdminAction } from "@/components/utils/auditLogHelper";
import {
  loadExecutionData,
  computeBilling,
  equipmentCloseout,
  inventoryCloseout,
  releaseRemainingInventory,
  finalizeReconciliation,
} from "./executionLogic";

import { useCateringEditAccess } from "./useCateringEditAccess";
import UnreleasedBatchesDialog from "./requisition/batches/UnreleasedBatchesDialog";

export default function ReconciliationTab({ event }) {
  const queryClient = useQueryClient();
  const { permissions, currentUser } = usePermissions();
  const selfBypass = useSelfApprovalBypass();
  const { canEditRecord } = useCateringEditAccess();
  const canEditEvent = canEditRecord(event);
  const [form, setForm] = useState({ actual_guests: "", additional_charges: [], post_event_notes: "", client_feedback: "", client_rating: "" });
  const [saving, setSaving] = useState(false);
  const [unreleased, setUnreleased] = useState(null);

  const { data: recs = [] } = useQuery({
    queryKey: ["catering-reconciliation", event?.id],
    queryFn: () => base44.entities.CateringReconciliation.filter({ event_id: event.id }),
    enabled: !!event?.id,
  });
  const { data: quotes = [] } = useQuery({
    queryKey: ["catering-quotes", event?.id],
    queryFn: () => base44.entities.CateringQuote.filter({ event_id: event.id }),
    enabled: !!event?.id,
  });
  const { data: exec } = useQuery({
    queryKey: ["catering-execution", event?.id],
    queryFn: () => loadExecutionData(event),
    enabled: !!event?.id,
  });

  const record = recs[0] || null;
  const finalized = record?.status === "finalized";

  useEffect(() => {
    if (record) {
      setForm({
        actual_guests: record.actual_guests ?? "",
        additional_charges: record.additional_charges || [],
        post_event_notes: record.post_event_notes || "",
        client_feedback: record.client_feedback || "",
        client_rating: record.client_rating ?? "",
      });
    }
  }, [record?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!event) return <EventScopeNotice />;

  const quote = quotes.find((q) => q.id === event.active_quote_id) || quotes.find((q) => q.status === "active") || null;
  const billing = computeBilling({ event, actualGuests: form.actual_guests, additionalCharges: form.additional_charges, quote });
  const approval = canFinalizeReconciliation({ permissions, currentUser, reconciliation: record, quote, selfBypass });
  const equip = equipmentCloseout(exec?.equipRes);
  const inv = inventoryCloseout(exec?.reservations);
  const closeoutBlockers = [
    equip.outstanding > 0 ? `${equip.outstanding} equipment item(s) still out — check them in from the Logistics or Equipment tab` : null,
    inv.held > 0 ? `${inv.held} stock reservation(s) still held — release them below` : null,
  ].filter(Boolean);

  const payload = () => ({
    branch_id: event.branch_id,
    branch_name: event.branch_name || "",
    event_id: event.id,
    event_name: event.event_name,
    event_date: event.event_date,
    client_id: event.client_id,
    client_name: event.client_name || "",
    expected_guests: Number(event.expected_guests) || 0,
    guaranteed_guests: billing.guaranteed,
    actual_guests: Number(form.actual_guests) || 0,
    guarantee_locked: billing.locked,
    billable_guests: billing.billable,
    billing_basis: billing.basis,
    quote_total: billing.quoteTotal,
    quote_id: quote?.id || "",
    guest_adjustment: billing.guestAdjustment,
    additional_charges: form.additional_charges,
    additional_charges_total: billing.additionalTotal,
    final_billing_total: billing.finalTotal,
    total_paid: billing.paid,
    final_balance_due: billing.balanceDue,
    equipment_returned_count: equip.returned,
    equipment_outstanding_count: equip.outstanding,
    equipment_damaged_count: equip.damaged,
    equipment_missing_count: equip.missing,
    inventory_released: inv.held === 0,
    post_event_notes: form.post_event_notes,
    client_feedback: form.client_feedback,
    client_rating: Number(form.client_rating) || undefined,
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-reconciliation"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-execution"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
    ]);

  const save = async () => {
    setSaving(true);
    try {
      if (record) await base44.entities.CateringReconciliation.update(record.id, payload());
      else await base44.entities.CateringReconciliation.create({ ...payload(), status: "open" });
      await refresh();
      toast.success("Reconciliation saved");
    } catch {
      toast.error("Could not save the reconciliation");
    } finally {
      setSaving(false);
    }
  };

  // Unreleased requisition batches stop closeout: the dialog offers hold / release now / close anyway, then re-runs it.
  const closeoutError = (error, context, fallback) => {
    if (error?.name === "UnreleasedBatchesError") return setUnreleased({ batches: error.batches, context });
    toast.error(error?.name === "RequisitionCloseoutBlockedError" ? error.message : fallback);
  };

  const releaseStock = async (closeout) => {
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const n = await releaseRemainingInventory({ event, userEmail: user?.email || "", closeout });
      setUnreleased(null);
      await refresh();
      toast.success(`${n} stock reservation(s) closed out`);
    } catch (error) {
      closeoutError(error, "stock", "Could not release the stock reservations");
    } finally {
      setSaving(false);
    }
  };

  const finalize = async (closeout) => {
    if (!record) return toast.error("Save the reconciliation first");
    if (!approval.allowed) return toast.error(approval.reason);
    // Re-runs from the unreleased-batches dialog were already confirmed.
    if (!closeout) {
      if (closeoutBlockers.length > 0 && !window.confirm(`${closeoutBlockers.length} closeout item(s) are still open. Finalize and complete the event anyway?`)) return;
      if (!window.confirm(`Confirm reconciliation is complete? This bills ${formatCurrency(billing.finalTotal, true)} and marks "${event.event_name}" as completed.`)) return;
    }
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.CateringReconciliation.update(record.id, payload());
      await finalizeReconciliation({ event, reconciliation: record, userEmail: user?.email || "", closeout });
      if (approval.selfApproved) logAdminAction("approve", "CateringReconciliation", `Self-approved (no second approver): closed ${event.event_name}`, { entityId: record.id, entityName: event.event_name, changes: { self_approval: true } });
      setUnreleased(null);
      await refresh();
      toast.success("Reconciliation finalized — event marked completed");
    } catch (error) {
      closeoutError(error, "finalize", "Could not finalize the reconciliation");
    } finally {
      setSaving(false);
    }
  };
  const rerunCloseout = (closeout = {}) => (unreleased?.context === "finalize" ? finalize(closeout) : releaseStock(closeout));

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">{event.event_name} · {event.event_date}</p>
          <p className="text-xs text-slate-500">{event.client_name}</p>
        </div>
        <Badge className={finalized ? "bg-emerald-100 text-emerald-700" : "bg-warning-100 text-warning-700"}>
          {finalized ? "Reconciliation finalized" : "Reconciliation open"}
        </Badge>
      </Card>

      <ActualCostsRecomputeButton event={event} finalized={finalized} />

      {/* Guest count */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Guest count</p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-slate-500">Expected</p><p className="font-medium">{event.expected_guests || 0}</p></div>
          <div><p className="text-xs text-slate-500">Guaranteed</p><p className="font-medium">{billing.guaranteed}</p></div>
          <div>
            <Label className="text-xs">Actual attended</Label>
            <Input type="number" min="0" disabled={finalized} value={form.actual_guests} onChange={(e) => setForm({ ...form, actual_guests: e.target.value })} />
          </div>
        </div>
        <div className={`rounded-lg border p-2.5 ${billing.locked ? "border-warning-200 bg-warning-50" : "border-slate-200 bg-slate-50"}`}>
          <p className={`text-xs flex items-center gap-1.5 ${billing.locked ? "text-warning-800" : "text-slate-700"}`}>
            {billing.locked && <Lock className="w-3.5 h-3.5" />}
            Billed on <span className="font-semibold">{billing.billable}</span> guest(s) — {billing.basis}
          </p>
        </div>
      </Card>

      {/* Final billing */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Final billing</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Quote total{quote?.guests_at_quote ? ` (priced for ${quote.guests_at_quote} guests)` : ""}</span><span>{formatCurrency(billing.quoteTotal, true)}</span></div>
          {billing.guestAdjustment !== 0 && (
            <div className="flex justify-between"><span className="text-slate-600">Guest count adjustment ({billing.billable - billing.pricedFor} × {formatCurrency(billing.perGuest, true)})</span><span>{formatCurrency(billing.guestAdjustment, true)}</span></div>
          )}
          <div className="flex justify-between"><span className="text-slate-600">Additional charges</span><span>{formatCurrency(billing.additionalTotal, true)}</span></div>
          <div className="flex justify-between font-semibold border-t pt-1"><span>Final amount owed</span><span>{formatCurrency(billing.finalTotal, true)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Already paid (deposits & payments)</span><span>{formatCurrency(billing.paid, true)}</span></div>
          <div className={`flex justify-between font-semibold ${billing.balanceDue > 0 ? "text-red-600" : "text-emerald-700"}`}>
            <span>{billing.balanceDue < 0 ? "Refund owed to client" : "Balance due"}</span>
            <span>{formatCurrency(Math.abs(billing.balanceDue), true)}</span>
          </div>
        </div>
        <div>
          <Label className="text-xs">Additional charges during the event</Label>
          <AdditionalChargesEditor charges={form.additional_charges} disabled={finalized} onChange={(c) => setForm({ ...form, additional_charges: c })} />
        </div>
      </Card>

      <EventCostMarginCard event={event} billedTotal={billing.finalTotal} />

      {/* Closeout */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Equipment & stock closeout</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-slate-500">Equipment returned</p><p className="font-medium">{equip.returned}</p></div>
          <div><p className="text-xs text-slate-500">Still out</p><p className={`font-medium ${equip.outstanding > 0 ? "text-red-600" : ""}`}>{equip.outstanding}</p></div>
          <div><p className="text-xs text-slate-500">Damaged</p><p className={`font-medium ${equip.damaged > 0 ? "text-warning-700" : ""}`}>{equip.damaged}</p></div>
          <div><p className="text-xs text-slate-500">Missing</p><p className={`font-medium ${equip.missing > 0 ? "text-red-600" : ""}`}>{equip.missing}</p></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
          <p className="text-sm text-slate-600">
            Stock reservations still held: <span className="font-medium">{inv.held}</span>{inv.consumed > 0 ? ` · ${inv.consumed} closed out` : ""}
          </p>
          {inv.held > 0 && !finalized && (
            <Button size="sm" variant="outline" onClick={() => releaseStock()} disabled={saving || !canEditEvent}>Release remaining stock</Button>
          )}
        </div>
        {closeoutBlockers.map((b, i) => (
          <p key={i} className="text-xs text-warning-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {b}</p>
        ))}
      </Card>

      {/* Notes */}
      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900">Post-event notes</p>
        <div>
          <Label className="text-xs">How did it go? (issues, what to change)</Label>
          <Textarea rows={3} disabled={finalized} value={form.post_event_notes} onChange={(e) => setForm({ ...form, post_event_notes: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs">Client feedback</Label>
            <Textarea rows={2} disabled={finalized} value={form.client_feedback} onChange={(e) => setForm({ ...form, client_feedback: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Rating (1–5)</Label>
            <Input type="number" min="1" max="5" disabled={finalized} value={form.client_rating} onChange={(e) => setForm({ ...form, client_rating: e.target.value })} />
          </div>
        </div>
      </Card>

      {finalized ? (
        <Card className="p-3 border-emerald-200 bg-emerald-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <p className="text-sm text-emerald-800">
            Finalized by {record.finalized_by || "staff"} — event completed. Final billed: {formatCurrency(record.final_billing_total || 0, true)}.
          </p>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={save} disabled={saving || !canEditEvent}><Save className="w-4 h-4" /> Save reconciliation</Button>
          <Button className="gap-1.5" onClick={() => finalize()} disabled={saving || !record || !approval.allowed || !canEditEvent} title={approval.reason}>
            <CheckCircle2 className="w-4 h-4" /> Confirm & complete event
          </Button>
          {!record && <p className="text-xs text-slate-500 self-center">Save once before the event can be closed.</p>}
          {!approval.allowed && <p className="text-xs text-warning-700 self-center">{approval.reason}</p>}
        </div>
      )}
      {unreleased && (
        <UnreleasedBatchesDialog batches={unreleased.batches} context={unreleased.context} onHold={() => setUnreleased(null)}
          onRetry={() => rerunCloseout({})} onCloseAnyway={(reason) => rerunCloseout({ resolution: "close_anyway", reason })} />
      )}
    </div>
  );
}