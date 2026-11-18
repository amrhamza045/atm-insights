import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle } from "lucide-react";
import IngredientPicker from "@/components/admin/recipe/IngredientPicker";
import UnitFuzzySelect from "@/components/inventory/UnitFuzzySelect";
import {
  normalizeUnit,
  getItemStockUnit,
  getItemCostUnit,
  roundQty,
} from "@/lib/unitConversion";

export default function UnitConversionDialog({
  open,
  onOpenChange,
  editingRule,
  form,
  setForm,
  formError,
  setFormError,
  inventoryItems,
  invById,
  onSave,
  isSaving,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingRule ? "Edit Unit Conversion Rule" : "New Unit Conversion Rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Rule Scope</Label>
            <Select
              value={form.scope}
              onValueChange={(v) => {
                setFormError("");
                setForm((prev) => ({ ...prev, scope: v }));
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global Unit Pair (applies to all items — compatible dimensions)</SelectItem>
                <SelectItem value="item">Item-Specific Rule (applies to one inventory item — any dimension)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.scope === "item" && (
            <div>
              <Label>Inventory Item *</Label>
              <IngredientPicker
                value={form.inventory_item_id}
                items={inventoryItems}
                subLabel={() => false}
                onSelect={(id) => {
                  const picked = invById.get(id);
                  setForm((prev) => ({
                    ...prev,
                    inventory_item_id: id,
                    inventory_item_name: picked?.name || "",
                    from_unit: prev.from_unit || normalizeUnit(picked?.purchase_unit_label) || "box",
                    to_unit: prev.to_unit || normalizeUnit(getItemStockUnit(picked)) || "kg",
                  }));
                }}
              />
              {form.inventory_item_id && invById.get(form.inventory_item_id) && (
                <p className="text-xs text-slate-500 mt-1">
                  Current item units — Buy in: <span className="font-mono font-medium">{getItemCostUnit(invById.get(form.inventory_item_id))}</span> · Stock/Sell in: <span className="font-mono font-medium">{getItemStockUnit(invById.get(form.inventory_item_id))}</span>
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <Label>1 Source Unit *</Label>
              <UnitFuzzySelect
                value={form.from_unit}
                onChange={(unitCode) => setForm((prev) => ({ ...prev, from_unit: unitCode }))}
                placeholder="Search unit…"
              />
            </div>
            <div>
              <Label>Equals Factor *</Label>
              <Input
                type="number"
                step="any"
                min="0.000001"
                value={form.factor}
                onChange={(e) => setForm((prev) => ({ ...prev, factor: e.target.value }))}
                placeholder="e.g. 1000"
              />
            </div>
            <div>
              <Label>Target Unit *</Label>
              <UnitFuzzySelect
                value={form.to_unit}
                onChange={(unitCode) => setForm((prev) => ({ ...prev, to_unit: unitCode }))}
                placeholder="Search unit…"
              />
            </div>
          </div>

          {form.from_unit && form.to_unit && Number(form.factor) > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900 space-y-1">
              <div className="font-mono font-semibold">
                1 {normalizeUnit(form.from_unit)} = {Number(form.factor)} {normalizeUnit(form.to_unit)}
              </div>
              {form.bidirectional && (
                <div className="font-mono text-emerald-700">
                  Inverse: 1 {normalizeUnit(form.to_unit)} = {roundQty(1 / Number(form.factor), 6)} {normalizeUnit(form.from_unit)}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <Label className="text-sm">Bidirectional Conversion</Label>
              <p className="text-xs text-slate-500">
                Automatically convert in both directions ({normalizeUnit(form.from_unit) || "A"} ↔ {normalizeUnit(form.to_unit) || "B"})
              </p>
            </div>
            <Switch
              checked={form.bidirectional}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, bidirectional: checked }))}
            />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Supplier 20kg carton or standard portion weight"
            />
          </div>

          {formError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {editingRule ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}