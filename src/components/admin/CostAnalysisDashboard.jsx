import { useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import usePaginatedCostAnalysis from "./costAnalysis/usePaginatedCostAnalysis";

export default function CostAnalysisDashboard() {
  const { selectedBranchId } = useBranch();
  const listTopRef = useRef(null);

  const {
    items,
    needsReviewItems,
    avgMargin,
    settings,
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
  } = usePaginatedCostAnalysis({
    branchId: selectedBranchId,
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Items with Recipes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Need Price Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{needsReviewItems.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Avg Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{avgMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Target Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {settings?.overall_restaurant_margin_percentage != null
                ? `${settings.overall_restaurant_margin_percentage}%`
                : "Not set"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items Needing Review */}
      {needsReviewItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Items Needing Price Review</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsReviewItems.map(item => (
                <div key={item.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p dir="auto" className="font-semibold text-red-900">{item.name}</p>
                      <p dir="auto" className="text-xs text-red-700 mt-1">{item.category}</p>
                    </div>
                    <Badge dir="ltr" variant="destructive">
                      {item.actualMargin.toFixed(1)}% margin
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-red-700">Price</p>
                      <p dir="ltr" className="font-medium text-red-900">£{item.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-700">Cost</p>
                      <p dir="ltr" className="font-medium text-red-900">£{item.totalCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-700">Target</p>
                      <p dir="ltr" className="font-medium text-red-900">{item.targetMargin.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-700">Difference</p>
                      <p dir="ltr" className="font-medium text-red-600">{item.marginDiff.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Items Analysis */}
      <Card ref={listTopRef}>
        <CardHeader>
          <CardTitle>All Items Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <span>Loading cost analysis…</span>
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No items with recipes yet</p>
          ) : (
            <>
              <motion.div
                key={`cost-analysis-page-${page}-${filterKey}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="space-y-2"
              >
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-lg ${item.needsReview ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p dir="auto" className="font-semibold">{item.name}</p>
                          {item.needsReview && (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <p dir="auto" className="text-xs text-slate-500">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!item.needsReview ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <Badge variant={item.needsReview ? "destructive" : "default"}>
                          {item.actualMargin.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Selling Price</p>
                        <p dir="ltr" className="font-medium text-green-600">£{item.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Cost</p>
                        <p dir="ltr" className="font-medium text-red-600">£{item.totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Profit</p>
                        <p dir="ltr" className="font-medium text-blue-600">£{(item.price - item.totalCost).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Actual Margin</p>
                        <p dir="ltr" className={`font-medium ${item.needsReview ? 'text-red-600' : 'text-green-600'}`}>
                          {item.actualMargin.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Target Margin</p>
                        <p dir="ltr" className="font-medium text-slate-700">
                          {item.targetMargin != null ? `${item.targetMargin.toFixed(1)}%` : "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>

              <EventsPaginationBar
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                currentCount={items.length}
                totalCount={totalCount}
                itemLabel="items with recipes"
                hasPrevPage={hasPrevPage}
                hasNextPage={hasNextPage}
                isFetchingPage={isFetchingPage}
                onPrevPage={goToPrevPage}
                onNextPage={goToNextPage}
                onGoToPage={goToPage}
                scrollTargetRef={listTopRef}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}