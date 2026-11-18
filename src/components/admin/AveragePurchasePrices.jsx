import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";

export default function AveragePurchasePrices() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [expandedItem, setExpandedItem] = useState(null);
  const { selectedBranchId } = useBranch();

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("name")
  });

  const { data: allInventory = [] } = useQuery({
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

  const { data: invoices = [] } = useQuery({
    queryKey: ["purchaseInvoices", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.PurchaseInvoice.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        1000
      );
      return all.filter(inv => inv.branch_id && (!selectedBranchId || inv.branch_id === selectedBranchId));
    }
  });

  const branchItemIds = new Set(allInventory.map(i => i.id));

  // Calculate average prices from invoices - by unit type
  const averagePrices = {};
  const supplierPrices = {}; // Track per-supplier prices

  invoices.forEach(invoice => {
    if (selectedBranchId && invoice.branch_id && invoice.branch_id !== selectedBranchId) return;
    if (invoice.items) {
      invoice.items.forEach(item => {
        if (selectedBranchId && branchItemIds.size > 0 && !branchItemIds.has(item.inventory_item_id)) return;
        const unitType = item.unit_type || "pcs";
        
        // Overall average by unit type
        if (!averagePrices[item.inventory_item_id]) {
          averagePrices[item.inventory_item_id] = {
            categoryId: item.category_id,
            categoryName: item.category_name,
            itemName: item.inventory_item_name,
            pcs: { total: 0, count: 0, prices: [] },
            weight: { total: 0, count: 0, prices: [] }
          };
        }

        const price = parseFloat(item.purchase_price) || 0;
        averagePrices[item.inventory_item_id][unitType].total += price;
        averagePrices[item.inventory_item_id][unitType].count += 1;
        
        // Store individual price entries with metadata
        const pricePerPcs = item.price_per_pcs || 0;
        averagePrices[item.inventory_item_id][unitType].prices.push({
          price,
          quantity: item.quantity,
          pcsCount: item.pieces_count,
          pricePerPcs,
          invoiceDate: invoice.invoice_date
        });
        
        // Track price per piece averages for weight-based items
        if (unitType === "weight" && pricePerPcs > 0) {
          if (!averagePrices[item.inventory_item_id].weight.pricePerPcsData) {
            averagePrices[item.inventory_item_id].weight.pricePerPcsData = { total: 0, count: 0 };
          }
          averagePrices[item.inventory_item_id].weight.pricePerPcsData.total += pricePerPcs;
          averagePrices[item.inventory_item_id].weight.pricePerPcsData.count += 1;
        }

        // Per-supplier tracking by unit type
        const key = `${item.inventory_item_id}_${invoice.supplier_id}_${unitType}`;
        if (!supplierPrices[key]) {
          supplierPrices[key] = {
            itemId: item.inventory_item_id,
            supplierId: invoice.supplier_id,
            supplierName: invoice.supplier_name,
            unitType,
            total: 0,
            count: 0,
            prices: []
          };
        }
        supplierPrices[key].total += price;
        supplierPrices[key].count += 1;
        supplierPrices[key].prices.push({
          price,
          quantity: item.quantity,
          pcsCount: item.pieces_count,
          pricePerPcs: item.price_per_pcs
        });
      });
    }
  });

  // Filter by category
  const categoryPrices = selectedCategory
    ? Object.entries(averagePrices)
        .filter(([, data]) => data.categoryId === selectedCategory)
        .map(([itemId, data]) => {
          const pcsAvg = data.pcs.count > 0 ? data.pcs.total / data.pcs.count : 0;
          const weightAvg = data.weight.count > 0 ? data.weight.total / data.weight.count : 0;
          const weightPricePerPcsAvg = data.weight.pricePerPcsData?.count > 0 
            ? data.weight.pricePerPcsData.total / data.weight.pricePerPcsData.count 
            : 0;
          
          const itemSuppliers = Object.values(supplierPrices)
            .filter(sp => sp.itemId === itemId)
            .map(sp => ({
              ...sp,
              avgPrice: sp.total / sp.count
            }))
            .sort((a, b) => a.avgPrice - b.avgPrice);
          
          return {
            itemId,
            ...data,
            pcsAvg,
            weightAvg,
            weightPricePerPcsAvg,
            suppliers: itemSuppliers
          };
        })
        .sort((a, b) => (b.pcsAvg || b.weightAvg) - (a.pcsAvg || a.weightAvg))
    : [];

  const categoryTotalItems = selectedCategory
    ? allInventory.filter(item => item.category_id === selectedCategory).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-slate-900 block mb-2">
            Select Inventory Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">-- All Categories --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 uppercase font-semibold">Items in Category</p>
              <p className="text-2xl font-bold text-blue-900">{categoryPrices.length}/{categoryTotalItems}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        )}
      </div>

      {/* Average Prices Grid */}
      {selectedCategory ? (
        categoryPrices.length > 0 ? (
          <div className="space-y-3">
            {categoryPrices.map(({ itemId, itemName, pcsAvg, weightAvg, weightPricePerPcsAvg, pcs, weight, suppliers }) => (
              <Card key={itemId} className="border-0 shadow-sm overflow-hidden">
                <div
                  onClick={() => setExpandedItem(expandedItem === itemId ? null : itemId)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold text-slate-900">
                        {itemName}
                      </CardTitle>
                      <div className="text-xs text-slate-600 mt-2 space-y-1">
                        {pcs.count > 0 && (
                          <p>
                            <span className="text-slate-500">Price/Piece:</span> 
                            <span className="ml-2 font-bold text-slate-900">{formatCurrency(pcsAvg)}</span>
                            <span className="ml-2 text-slate-400">({pcs.count} invoices)</span>
                          </p>
                        )}
                        {weight.count > 0 && (
                          <>
                            <p>
                              <span className="text-slate-500">Price/kg:</span> 
                              <span className="ml-2 font-bold text-slate-900">{formatCurrency(weightAvg)}</span>
                              <span className="ml-2 text-slate-400">({weight.count} invoices)</span>
                            </p>
                            {weightPricePerPcsAvg > 0 && (
                              <p>
                                <span className="text-slate-500">Avg Price/Piece (calculated):</span> 
                                <span className="ml-2 font-bold text-slate-900">{formatCurrency(weightPricePerPcsAvg)}</span>
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {expandedItem === itemId ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </CardHeader>
                </div>

                {/* Supplier Comparison */}
                {expandedItem === itemId && suppliers.length > 0 && (
                  <CardContent className="bg-slate-50 pt-0 pb-4 px-6 border-t">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-3 mt-3">Supplier Comparison by Unit Type</p>
                    <div className="space-y-3">
                      {suppliers.map((supplier, idx) => {
                        const compareAvg = supplier.unitType === "pcs" ? pcsAvg : weightAvg;
                        const diff = supplier.avgPrice - compareAvg;
                        const percentDiff = compareAvg > 0 ? ((diff / compareAvg) * 100).toFixed(1) : 0;
                        const isCheaper = diff < 0;
                        
                        return (
                          <div key={idx} className={`p-3 rounded-lg border ${
                            isCheaper 
                              ? "bg-green-50 border-green-200" 
                              : "bg-orange-50 border-orange-200"
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-sm font-medium text-slate-900">{supplier.supplierName}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {supplier.unitType === "pcs" ? "Price/Piece" : "Price/kg"}
                                </Badge>
                              </div>
                              <span className={`text-xs font-semibold ${
                                isCheaper ? "text-green-700" : "text-orange-700"
                              }`}>
                                {isCheaper ? "−" : "+"}{Math.abs(percentDiff)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-700 font-medium">{formatCurrency(supplier.avgPrice)}</span>
                              <span className="text-xs text-slate-500">{supplier.count} invoice{supplier.count !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm bg-amber-50 border-amber-200">
            <CardContent className="p-8 text-center">
              <p className="text-slate-600">No purchase history for items in this category</p>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-12 text-center">
            <p className="text-slate-500 font-medium">Select a category to view average purchase prices</p>
            <p className="text-sm text-slate-400 mt-2">These prices are calculated from historical invoices across all suppliers and used automatically in menu cost calculations</p>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      {selectedCategory && categoryPrices.length > 0 && (
        <Card className="border-0 shadow-sm bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-base text-green-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              How These Prices Are Used
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-green-800 space-y-2">
            <p>✓ Automatically applied when calculating menu item costs based on recipes</p>
            <p>✓ Updated dynamically as new invoices are added to the system</p>
            <p>✓ Reflects the true average cost of inventory items from suppliers</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}