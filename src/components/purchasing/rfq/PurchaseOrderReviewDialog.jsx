import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function PurchaseOrderReviewDialog({
  reviewDialog,
  onClose,
  itemApprovals,
  setItemApprovals,
  getStock,
  onFinalize,
  isPending,
}) {
  if (!reviewDialog) return null;

  const reviewApproved = Object.values(itemApprovals).filter((v) => v === "approved").length;
  const reviewTotal = Object.keys(itemApprovals).length;
  const allReviewed =
    reviewTotal > 0 && Object.values(itemApprovals).every((v) => v === "approved" || v === "rejected");

  return (
    <Dialog open={!!reviewDialog} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review PO — {reviewDialog.order_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              Review each item and decide whether to include it in the final PO. Only <strong>approved</strong> items will be ordered.
            </p>
            <div className="text-sm font-semibold text-orange-700 whitespace-nowrap ml-3">
              {reviewApproved}/{reviewTotal} approved
            </div>
          </div>

          <div className="space-y-3">
            {reviewDialog.items?.map((item) => {
              const currentStock = getStock(item.inventory_item_id);
              const approval = itemApprovals[item.inventory_item_id] || "pending";
              const stockLabel = item.selling_unit_label || item.purchase_unit_label || item.unit || "";

              let stockColor = "text-slate-600";
              if (currentStock !== null && item.low_stock_threshold) {
                stockColor =
                  currentStock <= item.low_stock_threshold ? "text-red-600 font-semibold" : "text-green-600";
              }

              return (
                <div
                  key={item.inventory_item_id}
                  className={`border rounded-lg p-4 transition-colors ${
                    approval === "approved"
                      ? "border-green-300 bg-green-50"
                      : approval === "rejected"
                        ? "border-red-300 bg-red-50 opacity-70"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.inventory_item_name}</p>
                      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>
                          Ordered: <strong>{item.quantity_ordered} {item.purchase_unit_label || item.unit}</strong>
                        </span>
                        <span>
                          Unit Price: <strong>{formatCurrency(item.unit_price)}</strong>
                        </span>
                        <span>
                          Line Total: <strong>{formatCurrency(item.total_price)}</strong>
                        </span>
                        <span className={stockColor}>
                          Current Stock: <strong>{currentStock !== null ? `${currentStock} ${stockLabel}` : "—"}</strong>
                        </span>
                        <span>
                          System Balance:{" "}
                          <strong>
                            {item.system_stock !== null && item.system_stock !== undefined
                              ? `${item.system_stock} ${item.manual_balance_unit || stockLabel}`
                              : "—"}
                          </strong>
                        </span>
                        <span>
                          Manual Price:{" "}
                          <strong>
                            {item.manual_unit_price !== "" && item.manual_unit_price != null
                              ? formatCurrency(item.unit_price)
                              : "—"}
                          </strong>
                        </span>
                      </div>
                      {item.purchase_unit !== item.selling_unit && (
                        <p className="text-xs text-blue-600 mt-1">
                          Bought in {item.purchase_unit_label || item.purchase_unit} → stocked as{" "}
                          {item.selling_unit_label || item.selling_unit}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() =>
                          setItemApprovals((prev) => ({ ...prev, [item.inventory_item_id]: "approved" }))
                        }
                        className={`gap-1 text-xs ${
                          approval === "approved"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-slate-200 text-slate-700 hover:bg-green-100"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          setItemApprovals((prev) => ({ ...prev, [item.inventory_item_id]: "rejected" }))
                        }
                        className={`gap-1 text-xs ${
                          approval === "rejected"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-slate-200 text-slate-700 hover:bg-red-100"
                        }`}
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {allReviewed && reviewApproved > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-1">Final PO Summary</p>
              <p className="text-sm text-green-700">
                {reviewApproved} of {reviewTotal} items approved — Total:{" "}
                <strong>
                  {formatCurrency(
                    reviewDialog.items
                      .filter((i) => itemApprovals[i.inventory_item_id] === "approved")
                      .reduce((s, i) => s + (i.total_price || 0), 0)
                  )}
                </strong>
              </p>
            </div>
          )}

          {allReviewed && reviewApproved === 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                All items rejected — this order will be cancelled.
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const all = {};
                (reviewDialog.items || []).forEach((i) => {
                  all[i.inventory_item_id] = "approved";
                });
                setItemApprovals(all);
              }}
              className="gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve All
            </Button>
            <Button
              disabled={!allReviewed || isPending}
              onClick={() => onFinalize({ order: reviewDialog, approvals: itemApprovals })}
              className={`gap-2 ${
                reviewApproved === 0 ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {isPending
                ? "Processing..."
                : reviewApproved === 0
                  ? "Cancel Order (All Rejected)"
                  : `Approve ${reviewApproved} Item${reviewApproved > 1 ? "s" : ""} & Finalize PO`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}