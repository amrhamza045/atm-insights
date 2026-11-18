import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Save, AlertCircle, Package } from "lucide-react";
import { toast } from "sonner";
import { logSuccess } from "@/components/utils/auditLogHelper";
import { quantityChange, logStockMovements } from "@/lib/stockMovements";
import { useBranch } from "@/components/branches/BranchContext";
import useBranchInventory from "@/components/inventory/useBranchInventory";

export default function ReinitiateStock() {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [quantities, setQuantities] = useState({});
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["systemSettingsStockFreeze"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "stock_review_settings" });
      return result[0];
    }
  });

  const { data: partialSettings } = useQuery({
    queryKey: ["partialStockReviewSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "partial_stock_review" });
      return result[0];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("name")
  });

  const { selectedBranchId, selectedBranch } = useBranch();
  const { data: allInventory = [], isLoading } = useBranchInventory();
  // Typed balances belong to the branch they were typed for.
  useEffect(() => setQuantities({}), [selectedBranchId]);

  // Get frozen categories from partial settings
  const frozenCategoryIds = partialSettings?.stock_review_frozen_categories || [];
  const isFreezeEnabled = partialSettings?.stock_review_freeze_enabled || settings?.stock_review_freeze_enabled || false;

  // Show frozen categories (or all if full freeze)
  const frozenCategories = frozenCategoryIds.length > 0
    ? categories.filter(c => frozenCategoryIds.includes(c.id))
    : categories;

  const filteredItems = selectedCategoryId
    ? allInventory.filter(item => item.category_id === selectedCategoryId)
    : [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(quantities).filter(([, val]) => val !== "" && val !== undefined);
      await Promise.all(
        updates.map(([itemId, qty]) =>
          base44.entities.InventoryItem.update(itemId, { quantity: parseFloat(qty) })
        )
      );
      const stamp = Date.now();
      await logStockMovements(updates.map(([itemId, qty]) => {
        const item = allInventory.find((i) => i.id === itemId);
        return item && quantityChange(item, item.quantity || 0, parseFloat(qty), {
          key: `adjustment:reinitiate:${itemId}:${stamp}`, type: "adjustment", source_entity: "InventoryItem", source_id: itemId,
          source_label: "Stock re-initiated (count)",
        });
      }));
      // Stock-level saves are left out of the audit log, so this deliberate reset is logged here.
      const names = updates.map(([itemId, qty]) => `${allInventory.find((i) => i.id === itemId)?.name || itemId}: ${parseFloat(qty)}`);
      logSuccess("update", "InventoryItem", `Re-initiated stock balances at ${selectedBranch?.name || "the selected branch"} for ${updates.length} item(s): ${names.join(", ")}`.slice(0, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      toast.success("Stock balances updated successfully");
      setQuantities({});
    },
    onError: () => {
      toast.error("Failed to update stock balances");
    }
  });

  const handleQuantityChange = (itemId, value) => {
    setQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const hasChanges = Object.values(quantities).some(v => v !== "" && v !== undefined);

  if (!selectedBranchId) {
    return <Card className="p-8 text-center text-slate-500">Select a branch at the top to reinitiate its stock.</Card>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Reinitiate Stock</h2>
        <p className="text-sm text-slate-500">Select a frozen inventory category and manually set the current balance per item at <span className="font-medium text-slate-700">{selectedBranch?.name}</span>. Values will be applied immediately upon saving.</p>
      </div>

      {!isFreezeEnabled && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>No active stock freeze is configured. You can still reinitiate stock for any category below.</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select value={selectedCategoryId} onValueChange={(val) => { setSelectedCategoryId(val); setQuantities({}); }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {frozenCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  {cat.name}
                  {frozenCategoryIds.includes(cat.id) && (
                    <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Frozen</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasChanges && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : `Save ${Object.values(quantities).filter(v => v !== "").length} Changes`}
          </Button>
        )}
      </div>

      {selectedCategoryId && (
        isLoading ? (
          <div className="text-center py-12 text-slate-400">Loading items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No inventory items in this category</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{filteredItems.length} items</span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw className="w-3.5 h-3.5" />
                Enter new balance → Save to apply immediately
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">Item</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Current Balance</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Unit</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">New Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const unit = item.selling_unit_label || item.unit || (item.selling_unit === "weight" ? "kg" : "pcs");
                  const newVal = quantities[item.id];
                  const hasChange = newVal !== undefined && newVal !== "";
                  return (
                    <tr key={item.id} className={`border-b ${idx % 2 === 0 ? "" : "bg-slate-50/50"} ${hasChange ? "bg-green-50/60" : ""}`}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-right text-slate-600 font-mono">
                        {item.quantity ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">{unit}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={`e.g. ${item.quantity ?? 0}`}
                          value={newVal ?? ""}
                          onChange={e => handleQuantityChange(item.id, e.target.value)}
                          className={`w-36 text-right ${hasChange ? "border-green-400 ring-1 ring-green-300" : ""}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {!selectedCategoryId && (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select a category to view and reinitiate stock balances</p>
        </div>
      )}
    </div>
  );
}