import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { buildUnitRows } from "@/components/catering/equipmentUnitCodes";
import EquipmentCategorySelect from "@/components/catering/equipment/EquipmentCategorySelect";
import AddEquipmentCategoryDialog from "@/components/catering/equipment/AddEquipmentCategoryDialog";
import { useEquipmentCategories } from "@/components/catering/equipment/useEquipmentCategories";

const empty = {
  name: "", category: "Cooking", tracking_mode: "bulk", total_quantity: "", unit_label: "pcs",
  storage_location: "", usage_cost_per_event: "", replacement_cost: "", shared: false, is_active: true, notes: "",
  purchase_date: "", unit_count: "", purchase_cost: "", useful_life_years: "", salvage_value_percentage: "",
};

export default function EquipmentFormDialog({ open, onOpenChange, item }) {
  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const { options: categories } = useEquipmentCategories();

  useEffect(() => {
    if (!open) return;
    setForm(item ? {
      name: item.name || "", category: item.category || "Other", tracking_mode: item.tracking_mode || "bulk",
      total_quantity: item.total_quantity ?? "", unit_label: item.unit_label || "pcs",
      storage_location: item.storage_location || "", usage_cost_per_event: item.usage_cost_per_event ?? "",
      replacement_cost: item.replacement_cost ?? "",
      shared: !item.home_branch_id, is_active: item.is_active !== false, notes: item.notes || "",
      purchase_date: item.purchase_date || "", unit_count: "",
      purchase_cost: item.purchase_cost ?? "", useful_life_years: item.useful_life_years ?? "",
      salvage_value_percentage: item.salvage_value_percentage ?? "",
    } : empty);
  }, [open, item]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        category: form.category,
        tracking_mode: form.tracking_mode,
        total_quantity: form.tracking_mode === "bulk" ? Number(form.total_quantity) || 0 : 0,
        unit_label: form.unit_label || "pcs",
        storage_location: form.storage_location,
        usage_cost_per_event: Number(form.usage_cost_per_event) || 0,
        replacement_cost: Number(form.replacement_cost) || 0,
        home_branch_id: form.shared ? "" : selectedBranchId || "",
        home_branch_name: form.shared ? "" : selectedBranch?.name || "",
        is_active: form.is_active,
        notes: form.notes,
        purchase_date: form.purchase_date || "",
        purchase_cost: Number(form.purchase_cost) || 0,
        useful_life_years: Number(form.useful_life_years) || 0,
        salvage_value_percentage: Number(form.salvage_value_percentage) || 0,
      };
      if (item) {
        await base44.entities.CateringEquipment.update(item.id, data);
        // Auto-generate any missing piece IDs so every owned piece always has one
        const existing = await base44.entities.CateringEquipmentUnit.filter({ equipment_id: item.id });
        const target = form.tracking_mode === "bulk"
          ? Number(form.total_quantity) || 0
          : existing.length + (Number(form.unit_count) || 0);
        const missing = Math.min(target - existing.length, 500);
        if (missing > 0) {
          const rows = buildUnitRows({ ...item, ...data }, missing, {
            existingCodes: existing.map((u) => u.unit_code),
            purchaseDate: form.purchase_date,
          });
          await base44.entities.CateringEquipmentUnit.bulkCreate(rows);
          await queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] });
        }
      } else {
        const created = await base44.entities.CateringEquipment.create(data);
        const count = Number(form.unit_count) || 0;
        if (form.tracking_mode === "unit" && count > 0) {
          const rows = buildUnitRows(created, Math.min(count, 500), { purchaseDate: form.purchase_date });
          await base44.entities.CateringEquipmentUnit.bulkCreate(rows);
          await queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] });
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["catering-equipment"] });
      toast.success(item ? "Equipment updated" : "Equipment added");
      onOpenChange(false);
    } catch {
      toast.error("Could not save the equipment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item ? "Edit equipment" : "Add equipment"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Folding Chair, 5kVA Generator…" />
            </div>
            <div>
              <Label>Category</Label>
              <EquipmentCategorySelect value={form.category} options={categories} onChange={(v) => set("category", v)} onNew={() => setAddCategoryOpen(true)} className="h-9" />
            </div>
          </div>
          <div>
            <Label>Tracking mode</Label>
            <select value={form.tracking_mode} onChange={(e) => set("tracking_mode", e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" disabled={!!item}>
              <option value="bulk">Bulk count — interchangeable pieces (chairs, plates, chafing dishes)</option>
              <option value="unit">Per unit — each unit tracked individually (generators, ovens)</option>
            </select>
            {item && <p className="text-xs text-slate-500 mt-1">Tracking mode is fixed after creation.</p>}
          </div>
          {form.tracking_mode === "bulk" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Owned quantity</Label>
                <Input type="number" min="0" value={form.total_quantity} onChange={(e) => set("total_quantity", e.target.value)} />
              </div>
              <div>
                <Label>Unit label</Label>
                <Input value={form.unit_label} onChange={(e) => set("unit_label", e.target.value)} placeholder="pcs, sets…" />
              </div>
            </div>
          ) : item ? (
            <div>
              <Label>Add more units</Label>
              <Input type="number" min="0" max="500" value={form.unit_count} onChange={(e) => set("unit_count", e.target.value)} placeholder="e.g. 2" />
              <p className="text-xs text-slate-500 mt-1">New pieces continue the automatic ID sequence.</p>
            </div>
          ) : (
            <div>
              <Label>How many units do you own?</Label>
              <Input type="number" min="0" max="500" value={form.unit_count} onChange={(e) => set("unit_count", e.target.value)} placeholder="e.g. 200" />
              <p className="text-xs text-slate-500 mt-1">Each piece gets an automatic incremental ID (e.g. FOLCHA-001 … FOLCHA-200).</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Purchase date</Label>
              <Input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
            </div>
            <div>
              <Label>Storage location</Label>
              <Input value={form.storage_location} onChange={(e) => set("storage_location", e.target.value)} placeholder="Main warehouse…" />
            </div>
            <div>
              <Label>Replacement cost (EGP / piece)</Label>
              <Input type="number" min="0" value={form.replacement_cost} onChange={(e) => set("replacement_cost", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-lg border p-3 bg-slate-50">
            <div>
              <Label>Purchase cost (EGP / piece)</Label>
              <Input type="number" min="0" value={form.purchase_cost} onChange={(e) => set("purchase_cost", e.target.value)} />
            </div>
            <div>
              <Label>Useful life (years)</Label>
              <Input type="number" min="0" step="0.5" value={form.useful_life_years} onChange={(e) => set("useful_life_years", e.target.value)} />
            </div>
            <div>
              <Label>Salvage value (%)</Label>
              <Input type="number" min="0" max="100" value={form.salvage_value_percentage} onChange={(e) => set("salvage_value_percentage", e.target.value)} />
            </div>
            <p className="col-span-3 text-xs text-slate-500">Straight-line depreciation: (purchase cost − salvage) ÷ useful life, reported in Catering Analysis → Equipment.</p>
          </div>
          <div>
            <Label>Cost per event (EGP / piece)</Label>
            <Input type="number" min="0" value={form.usage_cost_per_event} onChange={(e) => set("usage_cost_per_event", e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">Predefined usage cost — used to cost every event that reserves this item.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Shared across branches</p>
              <p className="text-xs text-slate-500">Off = owned by {selectedBranch?.name || "the selected branch"}</p>
            </div>
            <Switch checked={form.shared} onCheckedChange={(v) => set("shared", v)} />
          </div>
          {item && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <p className="text-sm font-medium">Active</p>
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{item ? "Update" : "Add"}</Button>
        </DialogFooter>
        <AddEquipmentCategoryDialog
          open={addCategoryOpen}
          onOpenChange={setAddCategoryOpen}
          existing={categories}
          onCreated={(name) => set("category", name)}
        />
      </DialogContent>
    </Dialog>
  );
}