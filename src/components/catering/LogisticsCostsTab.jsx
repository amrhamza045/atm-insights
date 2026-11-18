import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import { Plus, ArrowRightLeft } from "lucide-react";
import VehiclesDialog from "./VehiclesDialog";
import CopyBranchAssetsDialog from "./CopyBranchAssetsDialog";
import AllocationBadges from "./costs/AllocationBadges";
import { useAllocations, matchesAllocation } from "./costs/useAllocations";

/**
 * Predefined vehicle fleet and transport rates — not tied to any event.
 * The Logistics tab creates trips from these vehicles and can override the basis per trip.
 */
export default function LogisticsCostsTab({ filter = { status: "all", eventId: "all", from: "", to: "" } }) {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranch();
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [fleetOpen, setFleetOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const { status, eventId } = filter;
  const { vehicleAllocation } = useAllocations(filter);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["catering-vehicles"],
    queryFn: () => base44.entities.CateringVehicle.list("-created_date", 200),
  });

  const visible = useMemo(
    () => vehicles.filter((v) => !v.home_branch_id || v.home_branch_id === selectedBranchId),
    [vehicles, selectedBranchId]
  );

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        visible.map((v) => [
          v.id,
          {
            cost_basis: v.cost_basis || "per_km",
            cost_per_km: v.cost_per_km ?? 0,
            cost_per_day: v.cost_per_day ?? 0,
            status: v.status || "available",
          },
        ])
      )
    );
  }, [visible]);

  const filteredVehicles = useMemo(
    () => visible.filter((v) => matchesAllocation(vehicleAllocation(v), status, eventId)),
    [visible, status, eventId, vehicleAllocation]
  );

  const set = (id, key, value) => setDraft((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.CateringVehicle.bulkUpdate(
        visible.map((v) => ({
          id: v.id,
          cost_basis: draft[v.id]?.cost_basis || "per_km",
          cost_per_km: Number(draft[v.id]?.cost_per_km) || 0,
          cost_per_day: Number(draft[v.id]?.cost_per_day) || 0,
          status: draft[v.id]?.status || "available",
        }))
      );
      await queryClient.invalidateQueries({ queryKey: ["catering-vehicles"] });
      toast.success("Logistics costs saved — event trips now use them");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Predefined logistics costs</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyOpen(true)}>
              <ArrowRightLeft className="w-4 h-4" /> Copy from branch
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setFleetOpen(true)}>
              <Plus className="w-4 h-4" /> Add vehicle
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Manage the vehicle fleet and how each one is costed — per km (distance × rate) or per day (days × rate). These
          apply to every event; scope an event and open the Logistics tab to build trips and override the basis for that
          trip only.
        </p>

        {visible.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No vehicles yet — use “Add vehicle” to register your fleet.</p>
        ) : filteredVehicles.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No vehicles match this filter.</p>
        ) : (
          <div className="divide-y">
            {filteredVehicles.map((v) => {
              const d = draft[v.id] || {};
              const perDay = d.cost_basis === "per_day";
              return (
                <div key={v.id} className="py-2 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{v.name}{v.plate_number ? ` · ${v.plate_number}` : ""}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {v.vehicle_type?.replace(/_/g, " ")}{v.capacity_notes ? ` · ${v.capacity_notes}` : ""}
                    </p>
                    <AllocationBadges alloc={vehicleAllocation(v)} />
                  </div>
                  <Select value={d.cost_basis || "per_km"} onValueChange={(val) => set(v.id, "cost_basis", val)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_km">Cost per km</SelectItem>
                      <SelectItem value="per_day">Cost per day</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      placeholder={perDay ? "Cost / day (EGP)" : "Cost / km (EGP)"}
                      value={(perDay ? d.cost_per_day : d.cost_per_km) ?? ""}
                      onChange={(ev) => set(v.id, perDay ? "cost_per_day" : "cost_per_km", ev.target.value)}
                    />
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatCurrency(Number(perDay ? d.cost_per_day : d.cost_per_km) || 0)} {perDay ? "per day" : "per km"}
                    </p>
                  </div>
                  <Select value={d.status || "available"} onValueChange={(val) => set(v.id, "status", val)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        )}

        {visible.length > 0 && (
          <Button size="sm" className="mt-3" onClick={save} disabled={saving}>
            Save costs
          </Button>
        )}
      </Card>

      <CopyBranchAssetsDialog open={copyOpen} onOpenChange={setCopyOpen} assetTypes={["vehicles"]} title="Copy Vehicles from Another Branch" />
      <VehiclesDialog open={fleetOpen} onOpenChange={setFleetOpen} vehicles={visible} />
    </div>
  );
}