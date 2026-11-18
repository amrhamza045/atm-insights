import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import CopyBranchAssetsDialog from "./CopyBranchAssetsDialog";

const TYPES = ["van", "truck", "refrigerated_truck", "car", "motorbike", "other"];
const STATUS_STYLES = {
  available: "bg-emerald-100 text-emerald-700",
  maintenance: "bg-amber-100 text-amber-700",
  retired: "bg-slate-100 text-slate-500",
};

export default function VehiclesDialog({ open, onOpenChange, vehicles }) {
  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const [form, setForm] = useState({ name: "", plate_number: "", vehicle_type: "van", cost_basis: "per_km", cost_per_km: "", cost_per_day: "", capacity_notes: "" });
  const [saving, setSaving] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const visibleVehicles = (vehicles || []).filter(
    (v) => !selectedBranchId || !v.home_branch_id || v.home_branch_id === selectedBranchId
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catering-vehicles"] });

  const add = async () => {
    if (!form.name.trim()) return toast.error("Vehicle name is required");
    setSaving(true);
    try {
      await base44.entities.CateringVehicle.create({
        name: form.name.trim(),
        plate_number: form.plate_number.trim(),
        vehicle_type: form.vehicle_type,
        cost_basis: form.cost_basis,
        cost_per_km: form.cost_basis === "per_km" ? Number(form.cost_per_km) || 0 : 0,
        cost_per_day: form.cost_basis === "per_day" ? Number(form.cost_per_day) || 0 : 0,
        capacity_notes: form.capacity_notes,
        home_branch_id: selectedBranchId || "",
        home_branch_name: selectedBranch?.name || "",
        status: "available",
      });
      await refresh();
      setForm({ name: "", plate_number: "", vehicle_type: "van", cost_basis: "per_km", cost_per_km: "", cost_per_day: "", capacity_notes: "" });
      toast.success("Vehicle added");
    } catch {
      toast.error("Could not add the vehicle");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (v, status) => {
    try {
      await base44.entities.CateringVehicle.update(v.id, { status });
      await refresh();
    } catch {
      toast.error("Could not update the vehicle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Vehicle fleet {selectedBranch?.name ? `· ${selectedBranch.name}` : ""}</DialogTitle>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setCopyOpen(true)}>
              <ArrowRightLeft className="w-3.5 h-3.5" /> Copy from branch
            </Button>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Name (e.g. Van 1) *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Plate number" value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} />
              <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} className="px-2 py-2 border rounded-lg text-sm">
                {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              <select value={form.cost_basis} onChange={(e) => setForm({ ...form, cost_basis: e.target.value })} className="px-2 py-2 border rounded-lg text-sm">
                <option value="per_km">Cost per km</option>
                <option value="per_day">Cost per day</option>
              </select>
              {form.cost_basis === "per_km" ? (
                <Input type="number" min="0" placeholder="Cost / km (EGP)" value={form.cost_per_km} onChange={(e) => setForm({ ...form, cost_per_km: e.target.value })} />
              ) : (
                <Input type="number" min="0" placeholder="Cost / day (EGP)" value={form.cost_per_day} onChange={(e) => setForm({ ...form, cost_per_day: e.target.value })} />
              )}
            </div>
            <Input placeholder="Capacity notes (1.5 tons, 20 crates…)" value={form.capacity_notes} onChange={(e) => setForm({ ...form, capacity_notes: e.target.value })} />
            <Button className="w-full gap-1" onClick={add} disabled={saving}><Plus className="w-4 h-4" /> Add vehicle</Button>
          </div>

          {visibleVehicles.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">No vehicles registered for this branch yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {visibleVehicles.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-2.5 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{v.name}{v.plate_number ? ` · ${v.plate_number}` : ""}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {v.vehicle_type?.replace(/_/g, " ")}{v.capacity_notes ? ` · ${v.capacity_notes}` : ""}{v.cost_basis === "per_day" ? (v.cost_per_day ? ` · ${v.cost_per_day} EGP/day` : "") : (v.cost_per_km ? ` · ${v.cost_per_km} EGP/km` : "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${STATUS_STYLES[v.status] || ""}`}>{v.status}</Badge>
                    <select value={v.status} onChange={(e) => setStatus(v, e.target.value)} className="px-2 py-1 border rounded text-xs">
                      <option value="available">available</option>
                      <option value="maintenance">maintenance</option>
                      <option value="retired">retired</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">Vehicles under maintenance or retired can never be assigned to a trip.</p>
        </div>
        <CopyBranchAssetsDialog open={copyOpen} onOpenChange={setCopyOpen} assetTypes={["vehicles"]} title="Copy Vehicles from Another Branch" />
      </DialogContent>
    </Dialog>
  );
}