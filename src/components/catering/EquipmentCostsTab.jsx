import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { Plus, ChevronDown, ChevronRight, Search, X, FolderPlus, ArrowRightLeft } from "lucide-react";
import EquipmentFormDialog from "./EquipmentFormDialog";
import CopyBranchAssetsDialog from "./CopyBranchAssetsDialog";
import EquipmentUnitsDialog from "./EquipmentUnitsDialog";
import DeleteEquipmentDialog from "./DeleteEquipmentDialog";
import { useAllocations, matchesAllocation } from "./costs/useAllocations";
import EquipmentCostRow from "@/components/catering/costs/EquipmentCostRow";
import EmptyCategoryRow from "@/components/catering/equipment/EmptyCategoryRow";
import AddEquipmentCategoryDialog from "@/components/catering/equipment/AddEquipmentCategoryDialog";
import { useEquipmentCategories } from "@/components/catering/equipment/useEquipmentCategories";

/**
 * Predefined per-event usage cost for each equipment item — not tied to any event.
 * The Equipment tab costs an event's reservations from these figures, where each line can be overridden.
 */
export default function EquipmentCostsTab({ filter = { status: "all", eventId: "all", from: "", to: "" } }) {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranch();
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [unitsItem, setUnitsItem] = useState(null);
  const [expanded, setExpanded] = useState({});
  // Add category dialog: undefined = closed, null = opened from the header, an id = opened from that item's picker.
  const [categoryTarget, setCategoryTarget] = useState(undefined);
  const { status, eventId } = filter;
  const toggle = (c) => setExpanded((s) => ({ ...s, [c]: !s[c] }));
  const { options: categoryOptions, saved: savedCategories, inUse } = useEquipmentCategories();

  const { data: equipment = [] } = useQuery({
    queryKey: ["catering-equipment"],
    queryFn: () => base44.entities.CateringEquipment.list("-created_date", 500),
  });

  const { data: units = [] } = useQuery({
    queryKey: ["catering-equipment-units"],
    queryFn: () => base44.entities.CateringEquipmentUnit.list("-created_date", 2000),
  });

  const [deleteItem, setDeleteItem] = useState(null);
  const { data: reservations = [] } = useQuery({
    queryKey: ["catering-equipment-reservations"],
    queryFn: () => base44.entities.CateringEquipmentReservation.list("-created_date", 1000),
  });

  const visible = useMemo(
    () => equipment.filter((e) => e.is_active !== false && (!e.home_branch_id || e.home_branch_id === selectedBranchId)),
    [equipment, selectedBranchId]
  );

  const { equipmentAllocation } = useAllocations(filter);
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const filtered = useMemo(
    () => visible.filter((e) =>
      matchesAllocation(equipmentAllocation(e.id), status, eventId) &&
      (!term || [e.name, e.category].some((v) => (v || "").toLowerCase().includes(term)))
    ),
    [visible, status, eventId, equipmentAllocation, term]
  );

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      const key = e.category || "Uncategorised";
      (map[key] = map[key] || []).push(e);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => [category, items.sort((a, b) => a.name.localeCompare(b.name))]);
  }, [filtered]);

  // Added categories that no item here uses yet show as empty groups (not while searching or filtering).
  const groups = useMemo(() => {
    if (term || status !== "all" || eventId !== "all") return grouped;
    const shown = new Set(grouped.map(([c]) => c.toLowerCase()));
    const empty = savedCategories.filter((c) => !shown.has(c.name.toLowerCase())).map((c) => [c.name, [], c]);
    return [...grouped, ...empty].sort(([a], [b]) => a.localeCompare(b));
  }, [grouped, savedCategories, term, status, eventId]);

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        visible.map((e) => [
          e.id,
          {
            category: e.category || "",
            usage_cost_per_event: e.usage_cost_per_event ?? 0,
            replacement_cost: e.replacement_cost ?? 0,
            cost_source: e.cost_source || "owned",
          },
        ])
      )
    );
  }, [visible]);

  const set = (id, key, value) => setDraft((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.CateringEquipment.bulkUpdate(
        visible.map((e) => ({
          id: e.id,
          category: draft[e.id]?.category || e.category,
          usage_cost_per_event: Number(draft[e.id]?.usage_cost_per_event) || 0,
          replacement_cost: Number(draft[e.id]?.replacement_cost) || 0,
          cost_source: draft[e.id]?.cost_source || "owned",
        }))
      );
      await queryClient.invalidateQueries({ queryKey: ["catering-equipment"] });
      toast.success("Equipment changes saved — event equipment costs now use them");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Predefined equipment costs</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyOpen(true)}>
              <ArrowRightLeft className="w-4 h-4" /> Copy from branch
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCategoryTarget(null)}>
              <FolderPlus className="w-4 h-4" /> Add category
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add equipment
            </Button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Cost of using one piece on one event — an internal wear/handling charge for owned kit, or the rental fee for
          hired-in kit. These apply to every event; scope an event and open the Equipment tab to override a line for that
          event only.
        </p>

        {visible.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="Search equipment by name or category…"
              className="pl-9 pr-9 h-9"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100" aria-label="Clear search">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        )}

        {visible.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No equipment yet — use “Add equipment” to create your first item.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No equipment matches this filter.</p>
        ) : (
          <div className="space-y-5">
            {groups.map(([category, items, savedCategory]) =>
              items.length === 0 ? (
                <EmptyCategoryRow
                  key={category}
                  category={savedCategory}
                  canDelete={!inUse.some((n) => (n || "").toLowerCase() === category.toLowerCase())}
                />
              ) : (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => toggle(category)}
                    className="w-full flex items-center justify-between border-b pb-1 mb-1 text-left hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-1.5">
                      {expanded[category] || term ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <h4 className="text-sm font-semibold text-slate-800">{category}</h4>
                    </span>
                    <span className="text-xs text-slate-400">{items.length} item{items.length === 1 ? "" : "s"}</span>
                  </button>
                  <div className={expanded[category] || term ? "divide-y" : "hidden"}>
                    {items.map((e) => (
                      <EquipmentCostRow
                        key={e.id}
                        item={e}
                        draft={draft[e.id] || {}}
                        onChange={(key, value) => set(e.id, key, value)}
                        categories={categoryOptions}
                        onNewCategory={() => setCategoryTarget(e.id)}
                        unitCount={units.filter((u) => u.equipment_id === e.id).length}
                        alloc={equipmentAllocation(e.id)}
                        onUnits={() => setUnitsItem(e)}
                        onDelete={() => setDeleteItem(e)}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {visible.length > 0 && (
          <Button size="sm" className="mt-3" onClick={save} disabled={saving}>
            Save changes
          </Button>
        )}
      </Card>

      <DeleteEquipmentDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        items={deleteItem ? [deleteItem] : []}
        reservations={reservations}
        onDone={() => setDeleteItem(null)}
      />
      <CopyBranchAssetsDialog open={copyOpen} onOpenChange={setCopyOpen} assetTypes={["equipment"]} title="Copy Equipment from Another Branch" />
      <EquipmentFormDialog open={addOpen} onOpenChange={setAddOpen} item={null} />
      <EquipmentUnitsDialog
        open={!!unitsItem}
        onOpenChange={(o) => !o && setUnitsItem(null)}
        item={unitsItem}
        units={units}
      />
      <AddEquipmentCategoryDialog
        open={categoryTarget !== undefined}
        onOpenChange={(o) => !o && setCategoryTarget(undefined)}
        existing={categoryOptions}
        onCreated={(name) => categoryTarget && set(categoryTarget, "category", name)}
      />
    </div>
  );
}