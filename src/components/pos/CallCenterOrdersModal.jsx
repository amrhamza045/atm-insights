import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneCall, User, Phone, Clock, Loader2, ShoppingBag, Truck, UtensilsCrossed, Inbox, Check, CheckCircle2, X, MapPin, Send, Undo2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { toast } from "sonner";

const ORDER_TYPE_LABELS = { dine_in: "Dine-In", takeaway: "Takeaway", delivery: "Delivery" };
const ORDER_TYPE_ICONS = { dine_in: UtensilsCrossed, takeaway: ShoppingBag, delivery: Truck };

const getMinutesAgo = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 60000) : 0);
const formatTimeAgo = (mins) => {
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ${mins % 60}m ago`;
  return `${Math.floor(h / 24)}d ${h % 24}h ago`;
};

export default function CallCenterOrdersModal({ open, onClose, orders = [], onApproveOrder }) {
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const queryClient = useQueryClient();

  const sorted = [...orders].sort((a, b) => {
    if (a.status === "approved" && b.status !== "approved") return 1;
    if (a.status !== "approved" && b.status === "approved") return -1;
    return new Date(a.created_date) - new Date(b.created_date);
  });

  const updateStatus = async (order, data, successMsg) => {
    setBusyId(order.id);
    try {
      const user = await base44.auth.me();
      await base44.entities.VoiceOrder.update(order.id, {
        ...data,
        processed_by: user?.email || "",
        processed_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["callCenterOrders"] });
      toast.success(successMsg);
      return true;
    } catch {
      toast.error("Failed to update order");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleApprove = async (order) => {
    const ok = await updateStatus(order, { status: "approved" }, "Approved — build the POS order and confirm payment");
    if (ok && onApproveOrder) onApproveOrder(order);
  };

  const handleReject = async (order) => {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    const ok = await updateStatus(order, { status: "rejected", rejection_reason: rejectReason.trim() }, "Order rejected");
    if (ok) { setRejectingId(null); setRejectReason(""); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-blue-600" />
            Call Center Orders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 text-sm">Pending Approval</h3>
            <Badge variant="outline" className="text-xs text-slate-500">{sorted.filter(o => o.status !== "approved").length}</Badge>
          </div>

          {sorted.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No call center orders pending</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((order) => {
                const OrderIcon = ORDER_TYPE_ICONS[order.order_type] || ShoppingBag;
                const isApproved = order.status === "approved";
                const busy = busyId === order.id;
                return (
                  <div key={order.id} className={`p-3 border rounded-lg space-y-2.5 ${isApproved ? "border-green-300 bg-green-50/30" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <p className="font-medium text-sm text-slate-900 truncate">{order.customer_name || "Unknown"}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <p className="text-xs text-slate-500" dir="ltr">{order.customer_phone || "—"}</p>
                        </div>
                        {order.delivery_address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-500 break-words">{order.delivery_address}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <p className="text-xs text-slate-500">{formatTimeAgo(getMinutesAgo(order.created_date))}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge variant="outline" className="text-xs gap-1">
                          <OrderIcon className="w-3 h-3" />{ORDER_TYPE_LABELS[order.order_type] || order.order_type}
                        </Badge>
                        {isApproved && <Badge className="bg-green-600 text-white text-xs gap-0.5"><Check className="w-2.5 h-2.5" />Approved</Badge>}
                      </div>
                    </div>

                    {/* Items */}
                    {order.order_items?.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-2.5 space-y-1">
                        {order.order_items.map((it, i) => (
                          <div key={i} className="text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-700">{it.quantity}× {it.name}</span>
                              <span className="text-slate-500">{formatCurrency((it.price || 0) * (it.quantity || 0))}</span>
                            </div>
                            {it.comment && <p className="text-amber-700 pl-3">↳ {it.comment}</p>}
                          </div>
                        ))}
                        <div className="flex justify-between pt-1.5 border-t text-xs font-semibold">
                          <span>Total</span>
                          <span>{formatCurrency(order.estimated_total || 0)}</span>
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-xs text-slate-600 bg-warning-50 border border-warning-200 rounded p-2">
                        <span className="font-semibold">Call notes: </span>{order.notes}
                      </p>
                    )}

                    {order.call_center_agent && (
                      <p className="text-xs text-slate-400">Taken by {order.call_center_agent}</p>
                    )}

                    {/* Actions */}
                    {rejectingId === order.id ? (
                      <div className="space-y-2">
                        <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="h-8 text-xs" autoFocus />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleReject(order)} disabled={busy} className="bg-red-600 hover:bg-red-700 text-xs flex-1">Confirm Reject</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }} className="text-xs flex-1">Cancel</Button>
                        </div>
                      </div>
                    ) : isApproved ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateStatus(order, { status: "completed" }, "Marked as paid")} disabled={busy} className="flex-1 bg-green-600 hover:bg-green-700 text-xs gap-1">
                          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Confirm Payment
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(order, { status: "pending" }, "Approval undone")} disabled={busy} className="text-xs gap-1 border-warning-300 text-warning-700 hover:bg-warning-50">
                          <Undo2 className="w-3.5 h-3.5" />Undo Approval
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(order)} disabled={busy} className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs gap-1">
                          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(order.id)} disabled={busy} className="text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50">
                          <X className="w-3.5 h-3.5" />Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}