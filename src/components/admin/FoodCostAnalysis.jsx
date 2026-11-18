import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { TrendingUp, AlertCircle, PoundSterling, Zap, Edit2, Package } from "lucide-react";
import { toast } from "sonner";
import { computeIngredientCost, getItemStockUnit } from "@/lib/unitConversion";
import { useHasAnyPermission } from "@/components/permissions/PermissionsContext";

export default function FoodCostAnalysis() {
  const [editingItemId, setEditingItemId] = useState(null);
  // Same groups the menu data rule lets change items.
  const canEditMenu = useHasAnyPermission(["menu_create", "menu_edit", "menu_delete", "inventory_edit", "support_customization", "admin_systems"]);
  const [editingYield, setEditingYield] = useState("");

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list("-created_date")
  });

  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ["purchaseInvoices"],
    queryFn: () => base44.entities.PurchaseInvoice.list("-invoice_date", 200)
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItemsForFoodCost"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 1000)
  });

  const { data: unitRules = [] } = useQuery({
    queryKey: ["unitConversionRules"],
    queryFn: () => base44.entities.UnitConversionRule.list("-created_date", 500).catch(() => [])
  });

  const invById = useMemo(() => new Map(inventoryItems.map(i => [i.id, i])), [inventoryItems]);

  // Calculate average prices from invoices
  const averagePrices = useMemo(() => {
    const prices = {};
    purchaseInvoices.forEach(invoice => {
      invoice.items?.forEach(item => {
        if (!prices[item.inventory_item_id]) {
          prices[item.inventory_item_id] = [];
        }
        prices[item.inventory_item_id].push(item.purchase_price);
      });
    });

    // Calculate averages
    const avgPrices = {};
    Object.entries(prices).forEach(([itemId, priceList]) => {
      avgPrices[itemId] = priceList.reduce((a, b) => a + b, 0) / priceList.length;
    });
    return avgPrices;
  }, [purchaseInvoices]);

  // Calculate food cost for each item using unit conversion rules
  const foodCosts = useMemo(() => {
    return menuItems.map(item => {
      let recipeCost = 0;
      let ingredientCount = 0;

      // Get base recipe
      if (item.recipe && Array.isArray(item.recipe)) {
        item.recipe.forEach(recipeItem => {
          const inv = invById.get(recipeItem.inventory_item_id);
          const avgPrice = averagePrices[recipeItem.inventory_item_id] ?? inv?.cost_per_unit ?? 0;
          const quantity = Number(recipeItem.quantity_needed) || 0;
          if (inv) {
            const itemWithCost = { ...inv, cost_per_unit: avgPrice };
            const costRes = computeIngredientCost(quantity, recipeItem.unit || getItemStockUnit(inv), itemWithCost, unitRules);
            recipeCost += costRes.ok ? costRes.totalCost : avgPrice * quantity;
          } else {
            recipeCost += avgPrice * quantity;
          }
          ingredientCount++;
        });
      }

      // Apply waste/yield percentage
      const yieldPercentage = (item.waste_yield_percentage || 100) / 100;
      const theoreticalCost = yieldPercentage > 0 ? recipeCost / yieldPercentage : recipeCost;

      // Calculate food cost percentage
      const sellingPrice = item.price || 0;
      const foodCostPercent = sellingPrice > 0 ? (theoreticalCost / sellingPrice * 100).toFixed(1) : 0;

      // Calculate margin
      const margin = sellingPrice - theoreticalCost;
      const marginPercent = sellingPrice > 0 ? (margin / sellingPrice * 100).toFixed(1) : 0;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        sellingPrice,
        recipeCost,
        wasteYieldPercent: item.waste_yield_percentage || 100,
        theoreticalCost: theoreticalCost.toFixed(2),
        foodCostPercent,
        margin: margin.toFixed(2),
        marginPercent,
        ingredientCount,
        hasRecipe: ingredientCount > 0
      };
    });
  }, [menuItems, averagePrices, invById, unitRules]);

  const handleUpdateYield = async (itemId, newYield) => {
    try {
      const item = menuItems.find(i => i.id === itemId);
      if (item) {
        await base44.entities.MenuItem.update(itemId, {
          ...item,
          waste_yield_percentage: parseFloat(newYield) || 100
        });
        toast.success("Yield percentage updated");
        setEditingItemId(null);
        setEditingYield("");
      }
    } catch (error) {
      toast.error("Failed to update yield: " + error.message);
    }
  };

  const averageMargin = foodCosts.length > 0 
    ? (foodCosts.reduce((sum, item) => sum + parseFloat(item.marginPercent), 0) / foodCosts.length).toFixed(1)
    : 0;

  const itemsWithLowMargin = foodCosts.filter(item => parseFloat(item.marginPercent) < 20);
  const itemsWithoutRecipe = foodCosts.filter(item => !item.hasRecipe);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Menu Items</p>
              <p className="text-3xl font-bold mt-2">{foodCosts.length}</p>
              <p className="text-xs text-slate-600 mt-1">{foodCosts.filter(i => i.hasRecipe).length} with recipes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-xs text-slate-500 font-medium">Average Margin</p>
              <p className={`text-3xl font-bold mt-2 ${parseFloat(averageMargin) >= 30 ? 'text-green-600' : parseFloat(averageMargin) >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                {averageMargin}%
              </p>
              <p className="text-xs text-slate-600 mt-1">Across all items</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-xs text-slate-500 font-medium">Low Margin Items</p>
              <p className={`text-3xl font-bold mt-2 ${itemsWithLowMargin.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {itemsWithLowMargin.length}
              </p>
              <p className="text-xs text-slate-600 mt-1">Below 20% margin</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {itemsWithoutRecipe.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertCircle className="w-4 h-4" />
              Missing Recipes ({itemsWithoutRecipe.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-2">These items don't have recipes set, so cost analysis is unavailable:</p>
            <div className="flex flex-wrap gap-2">
              {itemsWithoutRecipe.slice(0, 10).map(item => (
                <Badge key={item.id} variant="outline" className="bg-white">{item.name}</Badge>
              ))}
              {itemsWithoutRecipe.length > 10 && (
                <Badge variant="outline" className="bg-white">+{itemsWithoutRecipe.length - 10} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items with Low Margin Warning */}
      {itemsWithLowMargin.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              Low Margin Alert ({itemsWithLowMargin.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-3">These items have margins below 20%:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {itemsWithLowMargin.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-600">{formatCurrency(item.sellingPrice)} selling price • {item.marginPercent}% margin</p>
                  </div>
                  <Badge className="bg-red-600">{item.foodCostPercent}% cost</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="w-4 h-4" />
            Menu Item Food Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-700">Item Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-700">Category</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-700">Selling Price</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-700">Recipe Cost</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-700">Waste/Yield %</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-700">Theoretical Cost</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-700">Food Cost %</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-700">Margin</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-700">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {foodCosts.map(item => {
                  const costPercent = parseFloat(item.foodCostPercent);
                  const marginPercent = parseFloat(item.marginPercent);
                  const costColor = costPercent > 50 ? 'text-red-600' : costPercent > 35 ? 'text-yellow-600' : 'text-green-600';
                  const marginColor = marginPercent >= 30 ? 'text-green-600' : marginPercent >= 20 ? 'text-yellow-600' : 'text-red-600';

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${item.hasRecipe ? '' : 'opacity-60'}`}>
                      <td className="px-3 py-2 font-medium text-slate-900">{item.name}</td>
                      <td className="px-3 py-2 text-slate-600">{item.category || '-'}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.sellingPrice)}</td>
                      <td className="px-3 py-2 text-right">{item.hasRecipe ? formatCurrency(item.recipeCost) : '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Badge variant="outline" className="text-xs">{item.wasteYieldPerc}%</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={canEditMenu ? "p-0 h-6 w-6" : "hidden"}
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditingYield(item.wasteYieldPercent.toString());
                            }}
                            title="Edit waste/yield percentage"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{item.hasRecipe ? formatCurrency(item.theoreticalCost) : '-'}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${costColor}`}>
                        {item.hasRecipe ? `${item.foodCostPercent}%` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{item.hasRecipe ? formatCurrency(item.margin) : '-'}</td>
                      <td className={`px-3 py-2 text-center font-bold ${marginColor}`}>
                        {item.hasRecipe ? `${item.marginPercent}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Yield Modal */}
      {editingItemId && (
        <Dialog open={!!editingItemId} onOpenChange={(open) => !open && setEditingItemId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Waste/Yield Percentage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">
                  Waste/Yield Percentage (%)
                </Label>
                <p className="text-xs text-slate-500 mb-2">
                  Enter as percentage. 100% = no waste, &lt;100% = accounts for waste/trim loss, &gt;100% = yield multiplier
                </p>
                <Input
                  type="number"
                  min="10"
                  max="200"
                  step="0.1"
                  value={editingYield}
                  onChange={(e) => setEditingYield(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">Examples:</p>
                <p>• 100% = Full yield (no waste)</p>
                <p>• 85% = 15% loss during prep</p>
                <p>• 120% = Recipe multiplier for plating/presentation</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditingItemId(null)}>Cancel</Button>
                <Button
                  onClick={() => handleUpdateYield(editingItemId, editingYield)}
                  disabled={!editingYield}
                >
                  Update
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {foodCosts.length === 0 && (
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No menu items found</p>
            <p className="text-sm text-slate-400 mt-2">Create menu items and add recipes to analyze food costs</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}