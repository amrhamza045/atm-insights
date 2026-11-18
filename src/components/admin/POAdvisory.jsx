import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { TrendingUp, AlertCircle, Zap, Lightbulb, Package } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";

export default function POAdvisory() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [daysOfHistory, setDaysOfHistory] = useState("30");
  const [safetyStock, setSafetyStock] = useState("5");
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const { selectedBranchId } = useBranch();

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("name")
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems", selectedBranchId],
    queryFn: async () => {
      const items = await base44.entities.MenuItem.list("-created_date", 500);
      return items.filter(m => !selectedBranchId || !m.branch_id || m.branch_id === selectedBranchId);
    }
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", selectedBranchId],
    queryFn: async () => {
      const list = await base44.entities.Order.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        500
      );
      return list.filter(o => !selectedBranchId || o.branch_id === selectedBranchId);
    }
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventoryItems", selectedBranchId],
    queryFn: async () => {
      const items = await base44.entities.InventoryItem.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        1000
      );
      return items.filter(i => !selectedBranchId || i.branch_id === selectedBranchId);
    }
  });

  const { data: averagePrices = [] } = useQuery({
    queryKey: ["purchaseInvoices", selectedBranchId],
    queryFn: async () => {
      const invoices = await base44.entities.PurchaseInvoice.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        200
      );
      const prices = {};
      invoices
        .filter(inv => inv.branch_id && (!selectedBranchId || inv.branch_id === selectedBranchId))
        .forEach(invoice => {
          invoice.items?.forEach(item => {
            if (!prices[item.inventory_item_id]) {
              prices[item.inventory_item_id] = [];
            }
            prices[item.inventory_item_id].push(item.purchase_price);
          });
        });
      return prices;
    }
  });

  const calculateRecommendations = () => {
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    setLoading(true);
    try {
      const days = parseInt(daysOfHistory);
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get recipes that use items from this category
      const categoryItems = inventory.filter(i => i.category_id === selectedCategory);
      const categoryItemIds = new Set(categoryItems.map(i => i.id));

      // Calculate consumption from completed orders
      const itemConsumption = {};
      const itemsSoldCount = {};

      orders
        .filter(o => new Date(o.created_date) >= cutoffDate && o.status === "completed")
        .forEach(order => {
          order.items?.forEach(orderItem => {
            const menuItem = menuItems.find(m => m.id === orderItem.menu_item_id);
            if (menuItem?.recipe) {
              menuItem.recipe.forEach(recipeItem => {
                if (categoryItemIds.has(recipeItem.inventory_item_id)) {
                  if (!itemConsumption[recipeItem.inventory_item_id]) {
                    itemConsumption[recipeItem.inventory_item_id] = 0;
                    itemsSoldCount[recipeItem.inventory_item_id] = 0;
                  }
                  const quantityPerUnit = recipeItem.quantity_needed || 1;
                  itemConsumption[recipeItem.inventory_item_id] += quantityPerUnit * orderItem.quantity;
                  itemsSoldCount[recipeItem.inventory_item_id] += orderItem.quantity;
                }
              });
            }
          });
        });

      // Generate recommendations
      const recs = Object.entries(itemConsumption).map(([itemId, totalConsumed]) => {
        const item = categoryItems.find(i => i.id === itemId);
        const dailyConsumption = totalConsumed / days;
        const weeklyConsumption = dailyConsumption * 7;
        const monthlyConsumption = dailyConsumption * 30;
        
        const safety = parseInt(safetyStock);
        const recommendedQty = weeklyConsumption + (safety * dailyConsumption);
        
        const currentStock = item?.quantity || 0;
        const daysOfStock = dailyConsumption > 0 ? currentStock / dailyConsumption : 0;
        const needsReorder = daysOfStock < 7;

        // Get average price
        const prices = averagePrices[itemId] || [];
        const avgPrice = prices.length > 0 
          ? prices.reduce((a, b) => a + b, 0) / prices.length 
          : 0;

        const estimatedCost = recommendedQty * avgPrice;

        return {
          itemId,
          itemName: item?.name || "Unknown",
          currentStock,
          daysOfStock: daysOfStock.toFixed(1),
          dailyConsumption: dailyConsumption.toFixed(2),
          weeklyConsumption: weeklyConsumption.toFixed(2),
          monthlyConsumption: monthlyConsumption.toFixed(2),
          recommendedQty: Math.ceil(recommendedQty),
          avgPrice,
          estimatedCost: estimatedCost.toFixed(2),
          needsReorder,
          unitLabel: item?.purchase_unit_label || item?.unit || "unit"
        };
      }).sort((a, b) => b.monthlyConsumption - a.monthlyConsumption);

      setRecommendations(recs);
      toast.success(`Generated ${recs.length} recommendations`);
    } catch (error) {
      toast.error("Failed to generate recommendations: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalRecommendedCost = recommendations?.reduce((sum, rec) => sum + parseFloat(rec.estimatedCost), 0) || 0;
  const criticalItems = recommendations?.filter(r => r.needsReorder) || [];

  return (
    <div className="space-y-4">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            PO Advisor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Analyze historical menu consumption patterns to suggest optimal reorder quantities based on current stock levels.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Days of History</label>
              <Input
                type="number"
                value={daysOfHistory}
                onChange={(e) => setDaysOfHistory(e.target.value)}
                min="7"
                max="365"
                placeholder="30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Safety Stock (days)</label>
              <Input
                type="number"
                value={safetyStock}
                onChange={(e) => setSafetyStock(e.target.value)}
                min="0"
                max="30"
                placeholder="5"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={calculateRecommendations} 
                disabled={loading || !selectedCategory}
                className="w-full gap-2"
              >
                <Zap className="w-4 h-4" />
                {loading ? "Analyzing..." : "Generate"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Items Alert */}
      {recommendations && criticalItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              Critical Reorder Alert ({criticalItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 mb-3">
              These items have less than 7 days of stock based on consumption patterns:
            </p>
            <div className="space-y-2">
              {criticalItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-red-200 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{item.itemName}</p>
                    <p className="text-xs text-slate-600">Current: {item.currentStock} {item.unitLabel} ({item.daysOfStock} days)</p>
                  </div>
                  <Badge className="bg-red-600">Reorder Now</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Purchase Recommendations
              </CardTitle>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Est. Cost</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(totalRecommendedCost)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {recommendations.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No consumption data available for this period</p>
              ) : (
                recommendations.map((rec, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border ${rec.needsReorder ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">{rec.itemName}</p>
                        {rec.needsReorder && (
                          <Badge className="mt-1 bg-red-600">Low Stock</Badge>
                        )}
                      </div>
                      <Badge variant="outline">{rec.unitLabel}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div className="bg-white p-2 rounded">
                        <p className="text-xs text-slate-500">Current Stock</p>
                        <p className="font-semibold text-slate-900">{rec.currentStock}</p>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <p className="text-xs text-slate-500">Days of Stock</p>
                        <p className={`font-semibold ${rec.daysOfStock < 7 ? 'text-red-600' : 'text-green-600'}`}>
                          {rec.daysOfStock} days
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <p className="text-xs text-slate-500">Avg Daily Use</p>
                        <p className="font-semibold text-slate-900">{rec.dailyConsumption}</p>
                      </div>
                      <div className="bg-white p-2 rounded">
                        <p className="text-xs text-slate-500">Monthly Use</p>
                        <p className="font-semibold text-slate-900">{rec.monthlyConsumption}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t pt-3">
                      <div>
                        <p className="text-xs text-slate-500">Unit Price</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(rec.avgPrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Recommend Qty</p>
                        <p className="font-bold text-amber-600 text-lg">{rec.recommendedQty}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Est. Cost</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(rec.estimatedCost)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Info */}
      {!recommendations && (
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Select a category and generate recommendations</p>
            <p className="text-sm text-slate-400 mt-2">Analyzes historical order data to suggest reorder quantities</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}