import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, AlertTriangle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import StockMovementHistory from "./movements/StockMovementHistory";
import usePaginatedInventoryItems from "./usePaginatedInventoryItems";

export default function StockReview() {
  const { selectedBranchId } = useBranch();
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [expandedItemId, setExpandedItemId] = useState(null);
  const tableTopRef = useRef(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("name")
  });

  const {
    items: pagedItems,
    filteredAllItems,
    totalCount,
    page,
    totalPages,
    pageSize,
    hasNextPage,
    hasPrevPage,
    filterKey,
    isLoading,
    isFetchingPage,
    goToNextPage,
    goToPrevPage,
    goToPage,
  } = usePaginatedInventoryItems({
    branchId: selectedBranchId,
    categoryId: selectedCategoryId === "all" ? "" : selectedCategoryId,
    categories,
    sort: "name",
    pageSize: 15,
  });

  const lowStockCount = filteredAllItems.filter(
    item => item.quantity <= (item.low_stock_threshold || 10)
  ).length;

  const toggleExpand = (itemId) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  };

  return (
    <div ref={tableTopRef} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Stock Review</h2>
          <p className="text-sm text-slate-500">Click any item to view its stock in/out history and average cost</p>
        </div>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 bg-warning-50 border border-warning-200 rounded-lg px-4 py-2 text-sm text-warning-700">
          <AlertTriangle className="w-4 h-4" />
          {lowStockCount} item{lowStockCount > 1 ? "s" : ""} below low stock threshold
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : pagedItems.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No items found{selectedCategoryId !== "all" ? " in this category" : ""}</p>
        </div>
      ) : (
        <>
          <motion.div
            key={`stock-review-page-${page}-${filterKey}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="overflow-x-auto rounded-lg border bg-white"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 w-6"></th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Item</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Current Stock</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Threshold</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Avg Cost/Unit</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item, idx) => {
                  const isLow = item.quantity <= (item.low_stock_threshold || 10);
                  const isCritical = item.quantity <= 0;
                  const cat = categories.find(c => c.id === item.category_id);
                  const unit = item.selling_unit_label || item.unit || (item.selling_unit === "weight" ? "kg" : "pcs");
                  const isExpanded = expandedItemId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`border-b cursor-pointer hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/50"} ${isExpanded ? "bg-blue-50 border-blue-100" : ""}`}
                        onClick={() => toggleExpand(item.id)}
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {isExpanded
                            ? <ChevronDown className="w-4 h-4 text-blue-500" />
                            : <ChevronRight className="w-4 h-4" />
                          }
                        </td>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-slate-500">{cat?.name || "—"}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${isCritical ? "text-red-600" : isLow ? "text-warning-600" : "text-green-700"}`}>
                          {item.quantity ?? 0} {unit}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {item.low_stock_threshold || 10} {unit}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {item.cost_per_unit ? formatCurrency(item.cost_per_unit) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCritical ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge className="bg-warning-100 text-warning-700 border-warning-200">Low Stock</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200">In Stock</Badge>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50/30 border-b border-blue-100">
                          <td colSpan={7} className="px-6 pb-4 pt-2">
                            <StockMovementHistory item={item} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          <EventsPaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            currentCount={pagedItems.length}
            totalCount={totalCount}
            itemLabel="items"
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            isFetchingPage={isFetchingPage}
            onPrevPage={goToPrevPage}
            onNextPage={goToNextPage}
            onGoToPage={goToPage}
            scrollTargetRef={tableTopRef}
          />
        </>
      )}
    </div>
  );
}