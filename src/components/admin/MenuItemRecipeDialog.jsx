import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Loader2, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { toStockQuantity, getItemStockUnit, normalizeUnit } from "@/lib/unitConversion";
import { computeRecipeRowCost, computeRecipeTotalCost } from "@/lib/menuItemRecipeCost";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { buildBranchInventoryMatcher } from "@/lib/branchInventoryTransferPlan";

const UNITS = ["g", "kg", "ml", "l", "pack", "piece", "pcs", "box", "cup"];

export default function MenuItemRecipeDialog({ menuItem, open, onClose }) {
  const queryClient = useQueryClient();
  const { selectedBranchId, selectedBranch } = useBranch();
  const [rows, setRows] = useState(menuItem?.recipe || []);
  const [saving, setSaving] = useState(false);

  const effectiveBranchId = menuItem?.branch_id || selectedBranchId || null;
  const effectiveBranchName = menuItem?.branch_name || selectedBranch?.name || "selected branch";

  const { data: allInventoryItems = [] } = useQuery({
    queryKey: ["inventoryItemsAll"],
    queryFn: () => base44.entities.InventoryItem.list("name", 1000)
  });

  // Strict branch isolation: only inventory items belonging to the effective branch are selectable
  const inventoryItems = effectiveBranchId
    ? allInventoryItems.filter((item) => item.branch_id === effectiveBranchId && item.is_active !== false)
    : allInventoryItems.filter((item) => item.is_active !== false);

  const allById = new Map(allInventoryItems.map((i) => [i.id, i]));
  const branchMatcher = buildBranchInventoryMatcher(inventoryItems);

  const crossBranchRows = effectiveBranchId
    ? rows
        .map((r, idx) => {
          if (!r?.inventory_item_id) return null;
          const fullItem = allById.get(r.inventory_item_id);
          if (fullItem && fullItem.branch_id === effectiveBranchId) return null;
          const resolution = branchMatcher.resolve({
            id: r.inventory_item_id,
            source_item_id: fullItem?.source_item_id,
            name: r.inventory_item_name || fullItem?.name,
            category_id: r.category_id || fullItem?.category_id,
          });
          return {
            idx,
            row: r,
            sourceBranchName: fullItem?.branch_name || "another branch",
            resolution,
          };
        })
        .filter(Boolean)
    : [];

  const handleRelinkCrossBranchRows = () => {
    if (!crossBranchRows.length) return;
    let relinked = 0;
    let unresolved = 0;
    setRows((prev) =>
      prev.map((r, idx) => {
        const entry = crossBranchRows.find((c) => c.idx === idx);
        if (!entry) return r;
        if (entry.resolution.status === "matched" && entry.resolution.item) {
          relinked++;
          const target = entry.resolution.item;
          return {
            ...r,
            inventory_item_id: target.id,
            inventory_item_name: target.name || r.inventory_item_name || "",
            category_id: target.category_id || r.category_id || "",
            unit: r.unit || target.selling_unit_label || target.unit || "",
          };
        }
        unresolved++;
        return r;
      })
    );
    if (relinked > 0) {
      toast.success(`Relinked ${relinked} ingredient(s) to ${effectiveBranchName} inventory.`);
    }
    if (unresolved > 0) {
      toast.error(`${unresolved} ingredient(s) have no unambiguous match in ${effectiveBranchName} inventory yet.`);
    }
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategoriesAll"],
    queryFn: () => base44.entities.InventoryCategory.list("name", 500)
  });

  const { data: unitRules = [] } = useQuery({
    queryKey: ["unitConversionRules"],
    queryFn: async () => {
      try {
        return await base44.entities.UnitConversionRule.list("-created_date", 500);
      } catch {
        return [];
      }
    }
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipesAll"],
    queryFn: () => base44.entities.Recipe.list("-created_date", 500)
  });

  const { totalCost: totalRecipeCost, costedCount, activeCount } = computeRecipeTotalCost(
    rows,
    inventoryItems,
    unitRules,
    recipes
  );
  const itemPrice = Number(menuItem?.price) || 0;
  const foodCostPct = itemPrice > 0 ? Math.round((totalRecipeCost / itemPrice) * 1000) / 10 : null;

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const next = { ...r, [field]: value };
      if (field === "inventory_item_id") {
        const item = inventoryItems.find(x => x.id === value);
        next.inventory_item_name = item?.name || "";
        next.unit = item?.unit || next.unit || "";
        next.category_id = item?.category_id || next.category_id;
      }
      return next;
    }));
  };

  const handleSave = async () => {
    const cleaned = rows
      .filter(r => r.inventory_item_id)
      .map(r => ({ ...r, quantity_needed: Number(r.quantity_needed) || 0 }));
    for (const r of cleaned) {
      const fullItem = allById.get(r.inventory_item_id);
      if (effectiveBranchId && (!fullItem || fullItem.branch_id !== effectiveBranchId)) {
        const otherBranch = fullItem?.branch_name || "another branch";
        toast.error(
          `Branch isolation error: "${r.inventory_item_name || fullItem?.name || "Ingredient"}" belongs to ${otherBranch}, not ${effectiveBranchName}. Relink it to ${effectiveBranchName} inventory before saving.`
        );
        return;
      }
      const item = inventoryItems.find(x => x.id === r.inventory_item_id);
      if (item) {
        const stockConv = toStockQuantity(r.quantity_needed, r.unit || getItemStockUnit(item), item, unitRules);
        if (!stockConv.ok) {
          toast.error(`Missing unit conversion for ${item.name}: ${stockConv.message}`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke("syncMenuItemRecipe", {
        menu_item_id: menuItem.id,
        recipe: cleaned,
        total_cost: totalRecipeCost,
        branch_id: selectedBranchId || null,
        branch_name: selectedBranch?.name || null,
      });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      toast.success("Recipe saved and synced to Manufacturing");
      onClose();
    } catch (error) {
      toast.error(`Failed: ${error?.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span>Recipe — {menuItem?.name}</span>
            {effectiveBranchId && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Branch: {effectiveBranchName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {crossBranchRows.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2 text-xs text-amber-900">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {crossBranchRows.length} ingredient(s) are linked to another branch&apos;s inventory ({crossBranchRows[0]?.sourceBranchName})
                  </p>
                  <p className="text-amber-800 mt-0.5">
                    Each branch must use its own isolated inventory. Relink these ingredients to {effectiveBranchName} inventory before saving.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleRelinkCrossBranchRows}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1 flex-shrink-0"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Match to {effectiveBranchName}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="text-sm text-slate-400 py-2">No ingredients yet</p>
          )}
          {rows.map((ing, idx) => {
            const selectedItem = inventoryItems.find(x => x.id === ing.inventory_item_id);
            const rowCategoryId = ing.category_id || selectedItem?.category_id || "";
            const filteredItems = rowCategoryId
              ? inventoryItems.filter(x => x.category_id === rowCategoryId)
              : inventoryItems;
            const stockUnit = getItemStockUnit(selectedItem);
            const stockConv = selectedItem ? toStockQuantity(Number(ing.quantity_needed) || 0, ing.unit || stockUnit, selectedItem, unitRules) : null;
            const rowCostInfo = computeRecipeRowCost(ing, inventoryItems, unitRules, recipes);
            return (
            <div key={idx} className="space-y-1">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={rowCategoryId}
                    onValueChange={(v) => {
                      setRows(prev => prev.map((r, i) => i === idx
                        ? { ...r, category_id: v, inventory_item_id: "", inventory_item_name: "" }
                        : r));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Raw Material</Label>
                  <Select value={ing.inventory_item_id || ""} onValueChange={(v) => updateRow(idx, "inventory_item_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {filteredItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={ing.quantity_needed ?? ""}
                    onChange={(e) => updateRow(idx, "quantity_needed", e.target.value)}
                  />
                </div>
                <div className="w-24">
                  <Label className="text-xs">Unit</Label>
                  <Select value={ing.unit || ""} onValueChange={(v) => updateRow(idx, "unit", v)}>
                    <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setRows(rows.filter((_, i) => i !== idx))}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {selectedItem && (
                <div className="text-[11px] pl-1 flex flex-wrap items-center gap-2">
                  {stockConv && !stockConv.ok ? (
                    <span className="text-red-600 font-medium">⚠ {stockConv.message}</span>
                  ) : stockConv && normalizeUnit(ing.unit) !== normalizeUnit(stockUnit) ? (
                    <span className="text-emerald-700 font-mono">
                      Converts to {stockConv.quantity} {stockUnit} in stock
                    </span>
                  ) : (
                    <span className="text-slate-500">Stock unit: {stockUnit}</span>
                  )}
                  <span className="text-slate-700 font-medium">
                    · Cost: {rowCostInfo.cost.toFixed(2)} EGP
                  </span>
                </div>
              )}
            </div>
            );
          })}
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setRows([...rows, { inventory_item_id: "", inventory_item_name: "", quantity_needed: 1, unit: "" }])}>
            <Plus className="w-3 h-3" /> Add Ingredient
          </Button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Total Recipe Cost (All Ingredients)</p>
              <p className="text-xs text-slate-500">
                {activeCount === 0
                  ? "Add ingredients above to calculate total recipe cost"
                  : `${costedCount} of ${activeCount} ingredient${activeCount === 1 ? "" : "s"} costed · used for package, quote, and event food cost calculations`}
              </p>
            </div>
            <span className="text-lg font-bold text-emerald-700">
              {formatCurrency(totalRecipeCost)}
            </span>
          </div>
          {itemPrice > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 text-xs text-slate-600">
              <span>Selling Price: <strong>{formatCurrency(itemPrice)}</strong></span>
              <span>Est. Gross Profit: <strong>{formatCurrency(itemPrice - totalRecipeCost)}</strong></span>
              <span>Food Cost %: <strong>{foodCostPct}%</strong></span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}