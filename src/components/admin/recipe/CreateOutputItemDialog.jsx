import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import UnitFuzzySelect from "@/components/inventory/UnitFuzzySelect";
import { normalizeUnit } from "@/lib/unitConversion";

export default function CreateOutputItemDialog({ initialName, initialUnit, branchId, branchName, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: initialName,
    category_id: "",
    unit: normalizeUnit(initialUnit) || initialUnit || "kg",
    quantity: 0,
    cost_per_unit: 0,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories", branchId],
    queryFn: () => base44.entities.InventoryCategory.filter(branchId ? { branch_id: branchId } : {}),
  });

  const save = async () => {
    const name = form.name.trim();
    if (!name) return toast.error("Item name is required");
    if (!form.category_id) return toast.error("Choose a category");
    setSaving(true);
    try {
      const dupQ = { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } };
      if (branchId) dupQ.branch_id = branchId;
      const [dup] = await base44.entities.InventoryItem.filter(dupQ);
      if (dup) { toast.info("An item with this name already exists — selected it"); return onCreated(dup); }
      const cat = categories.find((c) => c.id === form.category_id);
      const item = await base44.entities.InventoryItem.create({
        name, branch_id: branchId || null, branch_name: branchName || null,
        category_id: cat.id, category_name: cat.name,
        unit: form.unit, selling_unit_label: form.unit,
        quantity: Number(form.quantity) || 0, cost_per_unit: Number(form.cost_per_unit) || 0,
      });
      toast.success("Inventory item created");
      onCreated(item);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New inventory item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Unit</Label>
              <UnitFuzzySelect
                value={form.unit}
                onChange={(v) => set("unit", v)}
                placeholder="Search unit…"
              />
            </div>
            <div><Label>Starting stock</Label><Input type="number" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
            <div><Label>Cost / unit</Label><Input type="number" step="0.01" value={form.cost_per_unit} onChange={(e) => set("cost_per_unit", e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Create & select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}