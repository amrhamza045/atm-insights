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
import { vehicleCheck, buildChecklist, destinationFromEvent, transportCost } from "./logisticsLogic";
import { syncEventBilling } from "./serviceBilling";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function TripSetupDialog({ open, onOpenChange, trip, event, eventTrips, allTrips, vehicles }) {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranch();
  const [form, setForm] = useState({ trip_label: "", vehicle_id: "", driver_assignment_id: "", cost_basis: "per_km", distance_km: "", days_used: "", extra_cost: "", override_reason: "" });
  const [saving, setSaving] = useState(false);

  const { data: assignments = [] } = useQuery({
    queryKey: ["catering-assignments", event?.id],
    queryFn: () => base44.entities.CateringAssignment.filter({ event_id: event.id, status: "confirmed" }),
    enabled: open && !!event?.id,
  });

  useEffect(() => {
    if (!open) return;
    setForm(trip ? {
      trip_label: trip.trip_label || "",
      vehicle_id: trip.vehicle_id || "",
      driver_assignment_id: trip.driver_assignment_id || "",
      cost_basis: trip.cost_basis || "per_km",
      distance_km: trip.distance_km || "",
      days_used: trip.days_used || "",
      extra_cost: trip.extra_cost || "",
      override_reason: trip.override_reason || "",
    } : { trip_label: "", vehicle_id: "", driver_assignment_id: "", cost_basis: "per_km", distance_km: "", days_used: "", extra_cost: "", override_reason: "" });
  }, [open, trip]);

  const usableVehicles = useMemo(
    () => (vehicles || []).filter((v) => !v.home_branch_id || v.home_branch_id === selectedBranchId),
    [vehicles, selectedBranchId]
  );
  const vehicle = usableVehicles.find((v) => v.id === form.vehicle_id) || null;
  const check = vehicle ? vehicleCheck(vehicle, allTrips, event?.event_date, trip?.id) : {};
  const driver = assignments.find((a) => a.id === form.driver_assignment_id) || null;
  const costPreview = transportCost({
    cost_basis: form.cost_basis,
    distance_km: form.distance_km,
    cost_per_km: vehicle?.cost_per_km || 0,
    days_used: form.days_used,
    cost_per_day: vehicle?.cost_per_day || 0,
    extra_cost: form.extra_cost,
  });

  const save = async () => {
    if (vehicle && check.blocked) return toast.error(check.reason);
    if (vehicle && check.conflict && !form.override_reason.trim()) {
      return toast.error("This vehicle is already booked that date — an override reason is required to double-book");
    }
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const data = {
        trip_label: form.trip_label,
        vehicle_id: vehicle?.id || "",
        vehicle_name: vehicle?.name || "",
        vehicle_plate: vehicle?.plate_number || "",
        vehicle_conflict_override: !!(vehicle && check.conflict),
        vehicle_conflict_detail: vehicle && check.conflict ? check.reason : "",
        override_by: vehicle && check.conflict ? user?.email || "" : "",
        override_reason: vehicle && check.conflict ? form.override_reason.trim() : "",
        driver_assignment_id: driver?.id || "",
        driver_employee_id: driver?.employee_id || "",
        driver_name: driver?.employee_name || "",
        cost_basis: form.cost_basis,
        distance_km: form.cost_basis === "per_km" ? Number(form.distance_km) || 0 : 0,
        cost_per_km: vehicle?.cost_per_km || 0,
        days_used: form.cost_basis === "per_day" ? Number(form.days_used) || 0 : 0,
        cost_per_day: vehicle?.cost_per_day || 0,
        extra_cost: Number(form.extra_cost) || 0,
        estimated_transport_cost: costPreview,
      };
      if (trip) {
        await base44.entities.CateringTrip.update(trip.id, data);
      } else {
        const checklist = await buildChecklist(event, eventTrips, null);
        await base44.entities.CateringTrip.create({
          ...data,
          branch_id: event.branch_id,
          branch_name: event.branch_name || "",
          event_id: event.id,
          event_name: event.event_name,
          event_date: event.event_date,
          stage: "planned",
          checklist,
          ...destinationFromEvent(event),
          created_by: user?.email || "",
        });
      }
      await syncEventBilling(event);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-trips"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-trips-all"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-trips-branch"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-service-totals"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      ]);
      toast.success(trip ? "Trip updated" : "Trip created — loading checklist generated");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the trip");
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{trip ? "Edit trip" : "New trip"} — {event.event_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Trip label</Label>
            <Input value={form.trip_label} onChange={(e) => setForm({ ...form, trip_label: e.target.value })} placeholder="Trip 1 — equipment, Trip 2 — hot food…" />
          </div>
          <div>
            <Label>Vehicle</Label>
            <select
              value={form.vehicle_id}
              onChange={(e) => {
                const v = usableVehicles.find((x) => x.id === e.target.value);
                setForm({ ...form, vehicle_id: e.target.value, cost_basis: v?.cost_basis || form.cost_basis });
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">No vehicle yet…</option>
              {usableVehicles.map((v) => {
                const c = vehicleCheck(v, allTrips, event.event_date, trip?.id);
                return (
                  <option key={v.id} value={v.id} disabled={!!c.blocked}>
                    {v.name}{v.plate_number ? ` · ${v.plate_number}` : ""}{c.blocked ? ` — ${c.reason}` : c.conflict ? " — ⚠ booked this date" : ""}
                  </option>
                );
              })}
            </select>
            {vehicle && check.conflict && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <p className="text-xs font-medium text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {check.reason} — an override reason is required to double-book.
                </p>
                <Textarea rows={2} className="mt-1.5 bg-white" placeholder="Why is this double-booking allowed?" value={form.override_reason} onChange={(e) => setForm({ ...form, override_reason: e.target.value })} />
              </div>
            )}
          </div>
          <div>
            <Label>Driver (from this event's confirmed crew)</Label>
            <select value={form.driver_assignment_id} onChange={(e) => setForm({ ...form, driver_assignment_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">No driver yet…</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>{a.employee_name} ({a.role_name})</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Drivers are staffed through the Staffing tab like any other role — assign one there first if the list is empty.
            </p>
          </div>
          <div>
            <Label>Cost basis</Label>
            <select value={form.cost_basis} onChange={(e) => setForm({ ...form, cost_basis: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="per_km">Per km — distance × cost/km</option>
              <option value="per_day">Per day — days × cost/day</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.cost_basis === "per_km" ? (
              <div>
                <Label>Round-trip distance (km)</Label>
                <Input type="number" min="0" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
              </div>
            ) : (
              <div>
                <Label>Days used</Label>
                <Input type="number" min="0" step="0.5" value={form.days_used} onChange={(e) => setForm({ ...form, days_used: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Extra cost (tolls, parking…)</Label>
              <Input type="number" min="0" value={form.extra_cost} onChange={(e) => setForm({ ...form, extra_cost: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Transport estimate: <span className="font-semibold">{formatCurrency(costPreview, true)}</span>
            {form.cost_basis === "per_day"
              ? vehicle?.cost_per_day ? ` (${vehicle.cost_per_day} EGP/day)` : " — set the vehicle's cost/day in the fleet list"
              : vehicle?.cost_per_km ? ` (${vehicle.cost_per_km} EGP/km)` : " — set the vehicle's cost/km in the fleet list"}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{trip ? "Update trip" : "Create trip"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}