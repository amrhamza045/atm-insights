import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { listLocations, setupDefaults, renameLocation } from "./storageApi";
import LocationList from "./LocationList";
import LocationItems from "./LocationItems";

export default function StorageLocationsTab({ categories }) {
  const { selectedBranchId, selectedBranch } = useBranch();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["storageLocations", selectedBranchId],
    queryFn: () => listLocations(selectedBranchId),
    enabled: !!selectedBranchId,
  });
  const { data: counts = {} } = useQuery({
    queryKey: ["storageCounts", selectedBranchId],
    queryFn: async () => {
      const res = await base44.entities.InventoryItem.aggregate({ query: { branch_id: selectedBranchId }, groupBy: "storage_location_id" });
      const out = {};
      (res.rows || []).forEach((r) => { const k = r.storage_location_id || "__none"; out[k] = (out[k] || 0) + r.count; });
      return out;
    },
    enabled: !!selectedBranchId,
  });

  const refresh = () => ["storageLocations", "storageCounts", "storageItems", "inventoryItems"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); refresh(); }
    catch (e) { toast.error(e?.message || "Action failed"); }
    finally { setBusy(false); }
  };
  const addLocation = () => {
    if (!newName.trim()) return toast.error("Type a location name first");
    run(async () => {
      await base44.entities.StorageLocation.create({ branch_id: selectedBranchId, branch_name: selectedBranch?.name, name: newName.trim(), sort_order: locations.length });
      setNewName("");
    }, "Location added");
  };

  if (!selectedBranchId) return <Card className="p-8 text-center text-slate-500">Select a branch to manage its storage locations.</Card>;

  const mainLoc = locations.find((l) => l.name.toLowerCase() === "main storage");
  const active = selectedId || locations[0]?.id || null;
  const shownCounts = mainLoc ? { ...counts, [mainLoc.id]: (counts[mainLoc.id] || 0) + (counts.__none || 0) } : counts;
  const handleDelete = async (loc) => {
    if ((counts[loc.id] || 0) > 0) return toast.error("Move this location's items elsewhere before deleting it.");
    if (!confirm(`Delete ${loc.name}?`)) return;
    run(() => base44.entities.StorageLocation.delete(loc.id), "Location deleted");
    if (selectedId === loc.id) setSelectedId(null);
  };

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4">
      <Card className="p-3 space-y-3 h-fit">
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLocation()} placeholder="New location" />
          <Button size="icon" disabled={busy} onClick={addLocation}><Plus className="w-4 h-4" /></Button>
        </div>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /> : (
          <LocationList locations={locations} counts={shownCounts} selectedId={active} onSelect={setSelectedId}
            onRename={(loc, name) => run(() => renameLocation(loc, name), "Location renamed")} onDelete={handleDelete} />
        )}
        <Button variant="outline" size="sm" className="w-full gap-2" disabled={busy}
          onClick={() => run(async () => {
            const r = await setupDefaults(selectedBranchId, selectedBranch?.name);
            toast.message(`${r.created} location(s) added; unassigned items moved to Main Storage`);
          }, "Setup complete")}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          Set up defaults for this branch
        </Button>
        <p className="text-xs text-slate-500">Adds Main Storage, Fridge and Freezer if missing and puts this branch's unassigned items in Main Storage. Stock quantities are not changed.</p>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-3">{locations.find((l) => l.id === active)?.name || "Main Storage"}</h3>
        <LocationItems branchId={selectedBranchId} locationId={active} isMain={!!mainLoc && active === mainLoc.id} categories={categories} />
      </Card>
    </div>
  );
}