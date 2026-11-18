import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CheckCircle2, XCircle, Clock, Package, Truck, Edit, Trash2, FileCheck2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

function getItemApprovalIcon(status) {
  if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (status === "rejected") return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-orange-400" />;
}

export default function PurchaseOrderDetailsDialog({
  selectedOrder,
  onClose,
  getStatusColor,
  getStatusLabel,
  isRfqOrder,
  onOpenRfqPricing,
  onOpenReview,
  onConfirmOrder,
  onOpenDeliverConfirm,
  onOpenCancelReason,
  onOpenRecordPurchase,
  onEditOrder,
  onDeleteOrder,
}) {
  if (!selectedOrder) return null;
  const isRfq = isRfqOrder(selectedOrder);

  return (
    <Dialog open={!!selectedOrder} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <DialogTitle>{selectedOrder.order_number}</DialogTitle>
              {selectedOrder.rfq_number && selectedOrder.rfq_number !== selectedOrder.order_number && (
                <p className="text-xs text-slate-500 mt-0.5">Converted from {selectedOrder.rfq_number}</p>
              )}
            </div>
            <Badge className={getStatusColor(selectedOrder)}>
              {getStatusLabel(selectedOrder)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
            <div>
              <p className="text-sm text-slate-500">Category</p>
              <p className="font-semibold">{selectedOrder.inventory_category_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Date</p>
              <p className="font-semibold">{new Date(selectedOrder.order_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Supplier</p>
              <p className="font-semibold">{selectedOrder.supplier}</p>
            </div>
            {selectedOrder.supplier_contact && (
              <div>
                <p className="text-sm text-slate-500">Supplier Contact</p>
                <p className="font-semibold text-sm">{selectedOrder.supplier_contact}</p>
              </div>
            )}
            {selectedOrder.expected_delivery_date && (
              <div>
                <p className="text-sm text-slate-500">Expected Delivery</p>
                <p className="font-semibold">{new Date(selectedOrder.expected_delivery_date).toLocaleDateString()}</p>
              </div>
            )}
            {selectedOrder.rfq_quoted_by && (
              <div>
                <p className="text-sm text-slate-500">Quote Recorded By</p>
                <p className="font-semibold text-sm">{selectedOrder.rfq_quoted_by}</p>
              </div>
            )}
            {selectedOrder.reviewed_by && (
              <div>
                <p className="text-sm text-slate-500">Reviewed By</p>
                <p className="font-semibold text-sm">{selectedOrder.reviewed_by}</p>
              </div>
            )}
            {selectedOrder.receipt_confirmed_by && (
              <div>
                <p className="text-sm text-slate-500">Receipt Confirmed By</p>
                <p className="font-semibold text-sm">{selectedOrder.receipt_confirmed_by}</p>
              </div>
            )}
          </div>

          {selectedOrder.notes && (
            <div className="pb-4 border-b">
              <p className="text-sm text-slate-500 mb-1">Notes</p>
              <p className="text-sm bg-slate-50 p-3 rounded">{selectedOrder.notes}</p>
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              {isRfq ? "Requested RFQ Items" : "Order Items"} ({selectedOrder.items?.length || 0})
            </h4>
            <div className="space-y-2">
              {selectedOrder.items?.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between text-sm p-3 rounded border ${
                    item.approval_status === "rejected"
                      ? "bg-red-50 border-red-200 opacity-60"
                      : item.approval_status === "approved"
                        ? "bg-green-50 border-green-200"
                        : "bg-slate-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {!isRfq && getItemApprovalIcon(item.approval_status)}
                      <p className="font-medium">{item.inventory_item_name}</p>
                      {item.approval_status === "rejected" && (
                        <span className="text-xs text-red-600 font-medium">(Rejected)</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 ml-6">
                      {Number(item.unit_price) > 0
                        ? `${formatCurrency(item.unit_price)}/${item.purchase_unit_label || item.unit}`
                        : "Awaiting supplier quote"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {item.quantity_ordered} {item.purchase_unit_label || item.unit}
                    </p>
                    <p className="text-sm text-slate-600">
                      {Number(item.unit_price) > 0 ? formatCurrency(item.total_price) : "Quote pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end p-3 bg-amber-50 border border-amber-200 rounded">
              <span className="text-sm text-slate-600 mr-2">Total Amount:</span>
              <span className="text-lg font-bold text-amber-700">
                {isRfq && !(Number(selectedOrder.total_amount) > 0)
                  ? "Awaiting Quote"
                  : formatCurrency(selectedOrder.total_amount)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {isRfq && (
              <Button
                size="sm"
                onClick={() => {
                  const o = selectedOrder;
                  onClose();
                  onOpenRfqPricing(o);
                }}
                className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <FileCheck2 className="w-4 h-4" />
                Record RFQ Prices & Convert to PO
              </Button>
            )}

            {!isRfq &&
              (selectedOrder.status === "pending_approval" ||
                selectedOrder.status === "recommended" ||
                (selectedOrder.status === "pending" &&
                  selectedOrder.items?.some((i) => !i.approval_status || i.approval_status === "pending"))) && (
                <Button
                  size="sm"
                  onClick={() => {
                    const o = selectedOrder;
                    onClose();
                    onOpenReview(o);
                  }}
                  className="gap-1 bg-orange-500 hover:bg-orange-600"
                >
                  <CheckCircle className="w-4 h-4" />
                  Review & Approve Items
                </Button>
              )}

            {!isRfq && selectedOrder.status === "pending" && (
              <>
                <Button size="sm" onClick={() => onConfirmOrder(selectedOrder)} className="gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Confirm Order
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenCancelReason(selectedOrder)}
                  className="gap-1 text-red-600 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            )}

            {!isRfq && selectedOrder.status === "confirmed" && (
              <>
                <Button
                  size="sm"
                  onClick={() => onOpenDeliverConfirm(selectedOrder)}
                  className="gap-1 bg-green-600 hover:bg-green-700"
                >
                  <Truck className="w-4 h-4" />
                  Mark as Delivered
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenCancelReason(selectedOrder)}
                  className="gap-1 text-red-600 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Order
                </Button>
              </>
            )}

            {!isRfq && (selectedOrder.status === "pending" || selectedOrder.status === "confirmed") && (
              <Button
                size="sm"
                onClick={() => {
                  const o = selectedOrder;
                  onClose();
                  onOpenRecordPurchase(o);
                }}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Package className="w-4 h-4" />
                Verify & Record Purchase
              </Button>
            )}

            {(isRfq || selectedOrder.status === "pending_approval" || selectedOrder.status === "recommended") && (
              <Button size="sm" variant="outline" onClick={() => onEditOrder(selectedOrder)} className="gap-1 ml-auto">
                <Edit className="w-4 h-4" />
                {isRfq ? "Edit RFQ" : "Edit Order"}
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeleteOrder(selectedOrder)}
              disabled={selectedOrder.status === "confirmed" || selectedOrder.status === "delivered"}
              className="gap-1 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                selectedOrder.status === "confirmed" || selectedOrder.status === "delivered"
                  ? "Confirmed or Delivered orders cannot be deleted"
                  : "Delete"
              }
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}