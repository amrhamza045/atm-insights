import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, AlertTriangle, User, Phone, Clock, ChevronRight, Loader2, ShoppingBag, Truck, UtensilsCrossed, Inbox, Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { VoiceReviewDialog } from "@/components/voice/VoiceReviewPanel";

const OVERDUE_THRESHOLD_MIN = 30;

const getMinutesAgo = (createdDate) => {
  if (!createdDate) return 0;
  return Math.floor((Date.now() - new Date(createdDate).getTime()) / 60000);
};

const formatTimeAgo = (mins) => {
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return `${hours}h ${remMins}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
};

const ORDER_TYPE_LABELS = { dine_in: "Dine-In", takeaway: "Takeaway", delivery: "Delivery" };
const ORDER_TYPE_ICONS = { dine_in: UtensilsCrossed, takeaway: ShoppingBag, delivery: Truck };

export default function VoiceOrdersModal({ open, onClose, voiceOrders, onApproveOrder }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmingPaymentFor, setConfirmingPaymentFor] = useState(null);
  const queryClient = useQueryClient();

  // Sort oldest first (most urgent at top), approved at bottom
  const sortedOrders = [...voiceOrders].sort((a, b) => {
    if (a.status === "approved" && b.status !== "approved") return 1;
    if (a.status !== "approved" && b.status === "approved") return -1;
    return new Date(a.created_date) - new Date(b.created_date);
  });
  const overdueOrders = sortedOrders.filter((o) => o.status !== "approved" && getMinutesAgo(o.created_date) > OVERDUE_THRESHOLD_MIN);

  const handleApprove = async (order) => {
    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.VoiceOrder.update(order.id, {
        status: "approved",
        processed_by: currentUser?.email || "",
        processed_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
      toast.success("Voice order approved — create the POS order and confirm payment when done");
      setSelectedOrder(null);
      // Notify POS to link this voice order to the next created order
      if (onApproveOrder) onApproveOrder(order);
    } catch {
      toast.error("Failed to approve order");
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmPayment = async (order) => {
    setConfirmingPaymentFor(order.id);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.VoiceOrder.update(order.id, {
        status: "completed",
        processed_by: currentUser?.email || "",
        processed_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
      toast.success("Voice order marked as paid");
    } catch {
      toast.error("Failed to confirm payment");
    } finally {
      setConfirmingPaymentFor(null);
    }
  };

  const handleFlag = async (order) => {
    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.VoiceOrder.update(order.id, {
        status: "flagged",
        processed_by: currentUser?.email || "",
        processed_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
      toast.info("Order flagged for manual follow-up");
    } catch {
      toast.error("Failed to update order");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (order, reason) => {
    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.VoiceOrder.update(order.id, {
        status: "rejected",
        rejection_reason: reason,
        processed_by: currentUser?.email || "",
        processed_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
      toast.success("Order rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedOrder(null);
    } catch {
      toast.error("Failed to reject order");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={open && !selectedOrder} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-amber-600" />
              Voice Order Review
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Overdue Warning */}
            {overdueOrders.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  <span className="font-semibold">{overdueOrders.length} voice order{overdueOrders.length > 1 ? "s" : ""} overdue</span>{" "}
                  (exceeded {OVERDUE_THRESHOLD_MIN} min timeout). Please review immediately.
                </p>
              </div>
            )}

            {/* Pending Orders Header */}
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-slate-900">Pending Voice Orders</h3>
              <Badge variant="outline" className="text-xs text-slate-500">{sortedOrders.length}</Badge>
            </div>

            {/* Orders List */}
            {sortedOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No pending voice orders</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedOrders.map((order) => {
                  const minsAgo = getMinutesAgo(order.created_date);
                  const overdue = order.status !== "approved" && minsAgo > OVERDUE_THRESHOLD_MIN;
                  const approaching = order.status !== "approved" && minsAgo > OVERDUE_THRESHOLD_MIN / 2 && !overdue;
                  const isApproved = order.status === "approved";
                  const OrderIcon = ORDER_TYPE_ICONS[order.order_type] || ShoppingBag;
                  return (
                    <div
                      key={order.id}
                      className={`w-full flex items-center gap-3 p-3 bg-white border rounded-lg transition-all text-left ${
                        isApproved ? "border-green-300 bg-green-50/30" : "border-slate-200 hover:border-amber-400 hover:shadow-sm"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <p className="font-medium text-sm text-slate-900 truncate">{order.customer_name || "Unknown"}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <p className="text-xs text-slate-500" dir="ltr">{order.customer_phone || "—"}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${overdue ? "text-red-500" : approaching ? "text-warning-500" : "text-slate-400"}`} />
                            <p className={`text-xs ${overdue ? "text-red-600 font-medium" : approaching ? "text-warning-600" : "text-slate-500"}`}>
                              {formatTimeAgo(minsAgo)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge variant="outline" className="text-xs gap-1">
                            <OrderIcon className="w-3 h-3" />
                            {ORDER_TYPE_LABELS[order.order_type] || order.order_type}
                          </Badge>
                          {isApproved && <Badge className="bg-green-600 text-white text-xs gap-0.5"><Check className="w-2.5 h-2.5" />Approved</Badge>}
                          {overdue && <Badge className="bg-red-500 text-white text-xs">Overdue</Badge>}
                          {order.status === "flagged" && <Badge className="bg-warning-100 text-warning-800 text-xs border border-warning-300">Flagged</Badge>}
                          {order.status === "processing" && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />Processing
                            </Badge>
                          )}
                          {!isApproved && <ChevronRight className="w-4 h-4 text-slate-300" />}
                        </div>
                      </button>
                      {/* Confirm Payment button for approved orders */}
                      {isApproved && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmPayment(order)}
                          disabled={confirmingPaymentFor === order.id}
                          className="bg-green-600 hover:bg-green-700 text-xs gap-1 flex-shrink-0"
                        >
                          {confirmingPaymentFor === order.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Confirm Payment
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detailed Review Dialog */}
      {selectedOrder && (
        <VoiceReviewDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onApprove={() => handleApprove(selectedOrder)}
          onFlag={() => handleFlag(selectedOrder)}
          onReject={(reason) => handleReject(selectedOrder, reason)}
          processing={processing}
          showRejectDialog={showRejectDialog}
          setShowRejectDialog={setShowRejectDialog}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
        />
      )}
    </>
  );
}