import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { bulkAvailability, unitStatusCheck } from "./equipmentLogic";

// Events far enough along to hold equipment — mirrors Phase 1's deposit-stage trigger
const ELIGIBLE_STATUSES = ["deposit_pending", "confirmed", "in_progress"];

export default function ReserveEquipmentDialog({ open, onOpenChange, item, units, reservations, maintenance, scopedEvent }) {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranch();
  const [eventId, setEventId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["catering-events", selectedBranchId],
    queryFn: () => base44.entities.CateringEvent.filter({ branch_id: selectedBranchId }, "-event_date", 200),
    enabled: open && !!selectedBranchId,
  });

  const eligible = events.filter((e) => ELIGIBLE_STATUSES.includes(e.status));
  const event = eligible.find((e) => e.id === eventId) || null;

  useEffect(() => {
    if (!open) return;
    setEventId(scopedEvent && ELIGIBLE_STATUSES.includes(scopedEvent.status) ? scopedEvent.id : "");
    setQuantity("1");
    setSelectedUnitIds([]);
    setOverrideReason("");
  }, [open, scopedEvent, item]);

  const itemUnits = useMemo(() => (units || []).filter((u) => u.equipment_id === item?.id), [units, item]);
  const bulkAv = item && item.tracking_mode !== "unit" ? bulkAvailability(item, reservations, maintenance, event?.event_date || null) : null;

  const unitChecks = useMemo(() => {
    const map = {};
    itemUnits.forEach((u) => { map[u.id] = unitStatusCheck(u, reservations, event?.event_date || null); });
    return map;
  }, [itemUnits, reservations, event]);

  const conflictedSelected = selectedUnitIds.filter((id) => unitChecks[id]?.conflict);
  const qty = Math.max(0, Number(quantity) || 0);
  const bulkShortage = bulkAv ? Math.max(0, qty - bulkAv.free) : 0;

  const toggleUnit = (id) =>
    setSelectedUnitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    if (!event) return toast.error("Select an event (deposit stage or later)");
    if (item.tracking_mode === "unit" && !selectedUnitIds.length) return toast.error("Select at least one unit");
    if (item.tracking_mode !== "unit" && qty < 1) return toast.error("Enter a quantity");
    if (conflictedSelected.length && !overrideReason.trim()) {
      return toast.error("A conflicted unit needs an override reason before it can be double-booked");
    }
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const base = {
        branch_id: event.branch_id,
        branch_name: event.branch_name || "",
        event_id: event.id,
        event_name: event.event_name,
        event_date: event.event_date,
        equipment_id: item.id,
        equipment_name: item.name,
        tracking_mode: item.tracking_mode || "bulk",
        reserved_by: user?.email || "",
      };
      const rows = [];
      if (item.tracking_mode === "unit") {
        selectedUnitIds.forEach((id) => {
          const u = itemUnits.find((x) => x.id === id);
          const check = unitChecks[id] || {};
          rows.push({
            ...base,
            unit_id: u.id,
            unit_code: u.unit_code,
            quantity: 1,
            status: "reserved",
            had_conflict: !!check.conflict,
            conflict_detail: check.conflict ? check.reason : "",
            override_by: check.conflict ? user?.email || "" : "",
            override_reason: check.conflict ? overrideReason.trim() : "",
          });
        });
      } else {
        const covered = Math.min(qty, bulkAv.free);
        if (covered > 0) rows.push({ ...base, quantity: covered, unit_label: item.unit_label || "pcs", status: "reserved" });
        if (bulkShortage > 0) {
          rows.push({
            ...base,
            quantity: bulkShortage,
            unit_label: item.unit_label || "pcs",
            status: "requested",
            conflict_detail: `Shortage — only ${bulkAv.free} of ${qty} free on ${event.event_date}`,
          });
        }
      }
      await base44.entities.CateringEquipmentReservation.bulkCreate(rows);
      await queryClient.invalidateQueries({ queryKey: ["catering-equipment-reservations"] });
      if (bulkShortage > 0) toast.warning(`Reserved what was free — ${bulkShortage} ${item.unit_label || "pcs"} logged as an uncovered request`);
      else toast.success(`Reserved for "${event.event_name}"`);
      onOpenChange(false);
    } catch {
      toast.error("Could not create the reservation");
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Reserve — {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Event *</Label>
            <select value={eventId} onChange={(e) => { setEventId(e.target.value); setSelectedUnitIds([]); }} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Select an event…</option>
              {eligible.map((e) => (
                <option key={e.id} value={e.id}>{e.event_name} · {e.event_date} · {e.status.replace(/_/g, " ")}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Only events at deposit stage or later can hold equipment — same rule as stock reservations.</p>
          </div>

          {event && item.tracking_mode === "unit" && (
            <div>
              <Label>Units for {event.event_date}</Label>
              {itemUnits.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">No units registered — add them from the Units action first.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto mt-1">
                  {itemUnits.map((u) => {
                    const check = unitChecks[u.id] || {};
                    return (
                      <label
                        key={u.id}
                        className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${check.blocked ? "opacity-50 bg-slate-50" : "cursor-pointer hover:bg-slate-50"}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          disabled={!!check.blocked}
                          checked={selectedUnitIds.includes(u.id)}
                          onChange={() => toggleUnit(u.id)}
                        />
                        <span className="min-w-0">
                          <span className="font-medium">{u.unit_code}</span>
                          {check.blocked && <span className="text-red-600 text-xs block">{check.reason} — cannot be reserved</span>}
                          {check.conflict && (
                            <span className="text-amber-700 text-xs flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" /> {check.reason}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {conflictedSelected.length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <p className="text-xs font-medium text-amber-800">
                    {conflictedSelected.length} selected unit(s) are already booked — an override reason is required to double-book.
                  </p>
                  <Textarea rows={2} className="mt-1.5 bg-white" placeholder="Why is this double-booking allowed?" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                </div>
              )}
            </div>
          )}

          {event && item.tracking_mode !== "unit" && bulkAv && (
            <div>
              <Label>Quantity ({item.unit_label || "pcs"})</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <p className="text-xs text-slate-500 mt-1">
                Free on {event.event_date}: <span className={bulkAv.free > 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>{bulkAv.free}</span> of {bulkAv.total}
                {bulkAv.reserved > 0 ? ` · ${bulkAv.reserved} booked by other events` : ""}
                {bulkAv.underMaintenance > 0 ? ` · ${bulkAv.underMaintenance} out of service` : ""}
              </p>
              {bulkShortage > 0 && (
                <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Only {bulkAv.free} free — the remaining {bulkShortage} will be logged as an uncovered request and flagged in planning.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !event}>Reserve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}