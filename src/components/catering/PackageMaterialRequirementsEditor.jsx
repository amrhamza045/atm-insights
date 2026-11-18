import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import MaterialPicker from "./MaterialPicker";
import { requirementSummary } from "./PackageEquipmentRequirementsEditor";

const blank = { inventory_item_id: "", inventory_item_name: "", scaling_mode: "flat", quantity: 1, per_guest_divisor: 1, notes: "" };

/**
 * Template editor for a package's direct consumable materials (bulk items like
 * rice, charcoal, foil that aren't a menu-item recipe ingredient). Resolved and
 * SUMMED with recipe-exploded needs at event confirmation — nothing is reserved here.
 */
export default function PackageMaterialRequirementsEditor({ rows = [], onChange }) {
  const { data: items = [] } = useQuery({
    queryKey: ["inventory-items-picker"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 1000),
  });

  const set = (idx, patch) => onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 p-3">
          No extra materials — events using this package allocate only what its menu-item recipes imply. Add rows for
          bulk consumables (rice, charcoal, foil…) that the package always needs on top, so they're committed against
          stock automatically at confirmation.
        </p>
      )}

      {rows.map((r, idx) => {
        const item = items.find((i) => i.id === r.inventory_item_id);
        return (
          <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <MaterialPicker
                items={items}
                value={r.inventory_item_id}
                fallbackLabel={r.inventory_item_name}
                onChange={(it) => set(idx, { inventory_item_id: it.id, inventory_item_name: it.name })}
              />
              <Button variant="ghost" size="icon" onClick={() => onChange(rows.filter((_, i) => i !== idx))}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
              <div>
                <Label className="text-xs">Scaling</Label>
                <Select value={r.scaling_mode || "flat"} onValueChange={(v) => set(idx, { scaling_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="per_guest">Per guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">
                  {r.scaling_mode === "per_guest" ? "Qty / batch" : "Qty"}
                  {item ? ` (${item.selling_unit_label || item.unit || ""})` : ""}
                </Label>
                <Input type="number" min="0" step="any" value={r.quantity} onChange={(e) => set(idx, { quantity: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Guests per batch</Label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  disabled={r.scaling_mode !== "per_guest"}
                  value={r.scaling_mode === "per_guest" ? r.per_guest_divisor : ""}
                  placeholder={r.scaling_mode === "per_guest" ? "25" : "—"}
                  onChange={(e) => set(idx, { per_guest_divisor: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input value={r.notes || ""} placeholder="Optional" onChange={(e) => set(idx, { notes: e.target.value })} />
              </div>
            </div>

            <p className="text-xs text-slate-600">{requirementSummary(r)}</p>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onChange([...rows, { ...blank }])}>
        <Plus className="w-4 h-4" /> Add material requirement
      </Button>
    </div>
  );
}