import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { base44 } from "@/api/base44Client";
import { fileLinkProps, uploadPrivateReceipt } from "@/lib/privateFiles";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { isOrderInSession } from "@/components/utils/timezoneHelper";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import OrderAuditLogViewer from "./OrderAuditLogViewer";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function ClosedSessionDialog({ open, onOpenChange, viewingSession }) {
  const sessionPrintRef = useRef();
  const [exporting, setExporting] = useState(false);
  const [updatingPurchase, setUpdatingPurchase] = useState(null);
  const queryClient = useQueryClient();
  const { permissions } = usePermissions();
  // Same entitlement as CashierManagement's audit tab — flag, not role name.
  const canViewAudit = !!permissions?.cashier_audit_view;

  const { data: allOrders = [] } = useQuery({ queryKey: ["allOrders"], queryFn: () => base44.entities.Order.list("-created_date", 2000) });
  const { data: allExpenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-expense_date") });
  const { data: allPurchases = [] } = useQuery({ queryKey: ["cashierPurchases"], queryFn: () => base44.entities.CashierPurchase.list("-purchase_date") });
  const { data: allReturns = [] } = useQuery({ queryKey: ["returns"], queryFn: () => base44.entities.Return.list("-return_date") });
  const { data: allDeposits = [] } = useQuery({ queryKey: ["deposits"], queryFn: () => base44.entities.Deposit.list("-deposit_date") });

  const exportToPDF = async () => {
    if (!sessionPrintRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(sessionPrintRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let yPos = 0;
      if (imgHeight > 297) {
        const pages = Math.ceil(imgHeight / 297);
        for (let i = 0; i < pages; i++) {
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -yPos, imgWidth, imgHeight);
          yPos += 297;
        }
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }
      pdf.save(`Session-${viewingSession.session_date}-${viewingSession.cashier_name}.pdf`);
      toast.success("PDF downloaded");
    } catch { toast.error("Failed to generate PDF"); }
    finally { setExporting(false); }
  };

  const shareOnWhatsApp = async () => {
    if (!sessionPrintRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(sessionPrintRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
      const fileRef = await uploadPrivateReceipt(new File([pdf.output('blob')], `Session-${viewingSession.session_date}.pdf`, { type: 'application/pdf' }));
      const { data: share } = await base44.functions.invoke('createReportShareLink', { file_uri: fileRef, session_id: viewingSession.id, origin: window.location.origin });
      const file_url = `${share.url}\n⏳ Link valid for ${share.days} day(s)`;
      const msg = `📊 *Cashier Session Report*\n\n📅 Date: ${new Date(viewingSession.session_date).toLocaleDateString()}\n👤 Cashier: ${viewingSession.cashier_name}\n💰 Total Sales: ${formatCurrency(viewingSession.total_sales)}\n📦 Orders: ${viewingSession.total_orders}\n💵 Cash Diff: ${viewingSession.cash_difference >= 0 ? '+' : ''}${formatCurrency(viewingSession.cash_difference)}\n\n📄 Full Report: ${file_url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      toast.success("Opening WhatsApp");
    } catch { toast.error("Failed to share"); }
    finally { setExporting(false); }
  };

  if (!viewingSession) return null;

  const orders = allOrders.filter(o => isOrderInSession(o.created_date, viewingSession.opening_time, viewingSession.closing_time));
  const deposits = allDeposits.filter(d => d.session_id === viewingSession.id);
  const expenses = allExpenses.filter(e => e.session_id === viewingSession.id);
  const purchases = allPurchases.filter(p => p.session_id === viewingSession.id);
  const returns = allReturns.filter(r => r.session_id === viewingSession.id);

  // Orders by type
  const dineInOrders = orders.filter(o => o.order_type === "dine_in" && o.status !== "cancelled");
  const deliveryOrders = orders.filter(o => o.order_type === "delivery" && o.status !== "cancelled");
  const takeawayOrders = orders.filter(o => o.order_type === "takeaway" && o.status !== "cancelled");

  const sumOrders = (list) => list.reduce((s, o) => s + (o.total || 0), 0);

  // Payment method breakdowns (from session orders)
  const paidOrders = orders.filter(o => o.status !== "cancelled");
  const clSales = paidOrders.filter(o => o.payment_method === "cl").reduce((s, o) => s + (o.total || 0), 0);
  const hospitalitySales = paidOrders.filter(o => o.payment_method === "hospitality").reduce((s, o) => s + (o.total || 0), 0);

  // Totals
  const totalDeposits = deposits.reduce((s, d) => s + (d.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalPurchases = purchases.filter(p => p.status === "approved").reduce((s, p) => s + (p.total_amount || 0), 0);
  const totalReturns = returns.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Session — {new Date(viewingSession.session_date).toLocaleDateString()} · {viewingSession.cashier_name}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF} disabled={exporting} className="gap-2">
                <Download className="w-4 h-4" />{exporting ? "Generating..." : "Export PDF"}
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnWhatsApp} disabled={exporting} className="gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300">
                <Share2 className="w-4 h-4" />WhatsApp
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.filter(o=>o.status!=="cancelled").length})</TabsTrigger>
            {(() => { const uf = orders.filter(o => !["paid","completed","returned","cancelled"].includes(o.status)); return uf.length > 0 ? <TabsTrigger value="unfinished" className="text-orange-700">⚠️ Unfinished ({uf.length})</TabsTrigger> : null; })()}
            <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
            <TabsTrigger value="purchases">Purchases ({purchases.length})</TabsTrigger>
            <TabsTrigger value="deposits">Deposits ({deposits.length})</TabsTrigger>
            <TabsTrigger value="returns">Returns ({returns.length})</TabsTrigger>
            {canViewAudit && <TabsTrigger value="order-audit" className="text-amber-700">🕵️ Order Audit</TabsTrigger>}
          </TabsList>

          {/* SUMMARY TAB */}
          <TabsContent value="summary" className="space-y-4">
            <div ref={sessionPrintRef} className="space-y-4">
              {/* Header Info */}
              <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><p className="text-xs text-slate-500">Cashier</p><p className="font-semibold">{viewingSession.cashier_name}</p></div>
                    <div><p className="text-xs text-slate-500">Date</p><p className="font-semibold">{new Date(viewingSession.session_date).toLocaleDateString()}</p></div>
                    <div><p className="text-xs text-slate-500">Duration</p><p className="font-semibold">{Math.floor((new Date(viewingSession.closing_time) - new Date(viewingSession.opening_time)) / 3600000)}h {Math.floor(((new Date(viewingSession.closing_time) - new Date(viewingSession.opening_time)) % 3600000) / 60000)}m</p></div>
                    <div>
                      <p className="text-xs text-slate-500">Cash Difference</p>
                      <p className={`font-bold text-lg ${viewingSession.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {viewingSession.cash_difference >= 0 ? '+' : ''}{formatCurrency(viewingSession.cash_difference)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sales by Payment Method */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Sales by Payment Method</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">Cash</p>
                      <p className="font-bold text-green-700">{formatCurrency(viewingSession.cash_sales || 0)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">Card/Visa</p>
                      <p className="font-bold text-blue-700">{formatCurrency(viewingSession.card_sales || 0)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">Wallet</p>
                      <p className="font-bold text-purple-700">{formatCurrency(viewingSession.wallet_sales || 0)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">CL</p>
                      <p className="font-bold text-orange-700">{formatCurrency(clSales)}</p>
                    </div>
                    <div className="bg-pink-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">Hospitality</p>
                      <p className="font-bold text-pink-700">{formatCurrency(hospitalitySales)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-semibold text-slate-700">Total Sales</span>
                    <span className="text-xl font-bold text-green-700">{formatCurrency((viewingSession.total_sales || 0) + hospitalitySales)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Orders Summary by Type */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Orders Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Dine-In</p>
                      <p className="text-2xl font-bold text-amber-700">{dineInOrders.length}</p>
                      <p className="text-xs text-slate-600 mt-1">{formatCurrency(sumOrders(dineInOrders))}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Delivery</p>
                      <p className="text-2xl font-bold text-blue-700">{deliveryOrders.length}</p>
                      <p className="text-xs text-slate-600 mt-1">{formatCurrency(sumOrders(deliveryOrders))}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Takeaway</p>
                      <p className="text-2xl font-bold text-green-700">{takeawayOrders.length}</p>
                      <p className="text-xs text-slate-600 mt-1">{formatCurrency(sumOrders(takeawayOrders))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cash Position */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cash Position</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 border rounded-lg p-3">
                      <p className="text-xs text-slate-500">Opening Cash</p>
                      <p className="font-bold">{formatCurrency(viewingSession.opening_cash || 0)}</p>
                    </div>
                    <div className="bg-slate-50 border rounded-lg p-3">
                      <p className="text-xs text-slate-500">Expected Cash</p>
                      <p className="font-bold">{formatCurrency(viewingSession.expected_cash || 0)}</p>
                    </div>
                    <div className="bg-slate-50 border rounded-lg p-3">
                      <p className="text-xs text-slate-500">Actual (Closing)</p>
                      <p className="font-bold">{formatCurrency(viewingSession.closing_cash || 0)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Expenses</p>
                      <p className="font-bold text-red-600">-{formatCurrency(totalExpenses)}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Purchases</p>
                      <p className="font-bold text-amber-600">-{formatCurrency(totalPurchases)}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Deposits</p>
                      <p className="font-bold text-green-600">+{formatCurrency(totalDeposits)}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Returns</p>
                      <p className="font-bold text-orange-600">-{formatCurrency(totalReturns)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {viewingSession.notes && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Notes</p>
                    <p className="text-sm text-slate-600">{viewingSession.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* UNFINISHED ORDERS TAB */}
          <TabsContent value="unfinished" className="space-y-3">
            {(() => {
              const uf = orders.filter(o => !["paid","completed","returned","cancelled"].includes(o.status));
              if (!uf.length) return <Card><CardContent className="pt-6 text-center text-green-600">✓ No unfinished orders found in this session</CardContent></Card>;
              return (<>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-semibold text-orange-800">⚠️ {uf.length} order(s) were not fully closed (not paid/completed) when session ended. These need investigation.</p>
                </div>
                {uf.map(order => (
                  <Card key={order.id} className="border-orange-200 bg-orange-50">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">#{order.id.slice(0,8).toUpperCase()}</p>
                            <Badge className="bg-orange-100 text-orange-700 capitalize text-xs">{order.status}</Badge>
                            {order.payment_method ? <Badge variant="outline" className="text-xs">{order.payment_method}</Badge> : <Badge className="bg-red-100 text-red-700 text-xs">No payment</Badge>}
                            {order.customer_name && <span className="text-sm text-slate-700">{order.customer_name}</span>}
                            {order.table_number && <Badge variant="outline" className="text-xs">Table {order.table_number}</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{new Date(order.created_date).toLocaleString()}</p>
                          {order.items && <p className="text-xs text-slate-500 mt-0.5">{order.items.length} item(s): {order.items.slice(0,3).map(i=>`${i.name} x${i.quantity}`).join(", ")}{order.items.length > 3 ? "..." : ""}</p>}
                        </div>
                        <p className="font-bold text-base ml-3 text-orange-700">{formatCurrency(order.total || 0)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>);
            })()}
          </TabsContent>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="space-y-3">
            {["dine_in", "delivery", "takeaway"].map(type => {
              const typeOrders = orders.filter(o => o.order_type === type && o.status !== "cancelled");
              if (typeOrders.length === 0) return null;
              const typeLabel = type === "dine_in" ? "Dine-In" : type === "delivery" ? "Delivery" : "Takeaway";
              return (
                <div key={type}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
                    <span>{typeLabel} Orders ({typeOrders.length})</span>
                    <span className="text-green-700">{formatCurrency(sumOrders(typeOrders))}</span>
                  </h3>
                  <div className="space-y-2">
                    {typeOrders.map(order => (
                      <Card key={order.id} className="border-slate-200">
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm">{order.customer_name || "Unknown"}</p>
                                {order.table_number && <Badge variant="outline" className="text-xs">Table {order.table_number}</Badge>}
                                <Badge variant="outline" className="text-xs capitalize">{order.payment_method || "—"}</Badge>
                                <Badge className={`text-xs ${order.status === "completed" || order.status === "paid" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>{order.status}</Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{new Date(order.created_date).toLocaleTimeString()}</p>
                              {order.items && (
                                <p className="text-xs text-slate-500 mt-0.5">{order.items.length} item(s): {order.items.slice(0, 3).map(i => `${i.name} x${i.quantity}`).join(", ")}{order.items.length > 3 ? "..." : ""}</p>
                              )}
                            </div>
                            <p className="font-bold text-base ml-3">{formatCurrency(order.total || 0)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
            {orders.filter(o => o.status !== "cancelled").length === 0 && (
              <Card><CardContent className="pt-6 text-center text-slate-500">No orders in this session</CardContent></Card>
            )}
          </TabsContent>

          {/* EXPENSES TAB */}
          <TabsContent value="expenses" className="space-y-3">
            {expenses.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-slate-500">No expenses in this session</CardContent></Card>
            ) : (
              <>
                {expenses.map(expense => (
                  <Card key={expense.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold">{expense.description}</p>
                            <Badge variant={expense.status === "approved" ? "default" : expense.status === "rejected" ? "destructive" : "secondary"}>{expense.status}</Badge>
                            {expense.category && <Badge variant="outline">{expense.category}</Badge>}
                          </div>
                          <div className="flex gap-3 text-sm text-slate-600 flex-wrap">
                            <span>{new Date(expense.expense_date).toLocaleString()}</span>
                            {expense.recipient && <span>To: {expense.recipient}</span>}
                          </div>
                          {expense.receipt_url && <a {...fileLinkProps(expense.receipt_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-1">📎 View receipt</a>}
                        </div>
                        <p className="text-xl font-bold text-red-600 ml-3">-{formatCurrency(expense.amount)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-900">Total Expenses:</span>
                      <span className="text-2xl font-bold text-red-600">-{formatCurrency(totalExpenses)}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* PURCHASES TAB */}
          <TabsContent value="purchases" className="space-y-3">
            {purchases.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-slate-500">No purchases in this session</CardContent></Card>
            ) : (
              <>
                {purchases.map(purchase => (
                  <Card key={purchase.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold">{purchase.supplier}</p>
                            <Badge variant={purchase.status === "approved" ? "default" : purchase.status === "rejected" ? "destructive" : "secondary"}>{purchase.status}</Badge>
                            {purchase.payment_status === "pending_payment" ? (
                              <Badge className="bg-warning-100 text-warning-700 text-xs">Unpaid to Supplier</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 text-xs">Paid</Badge>
                            )}
                          </div>
                          <div className="flex gap-3 text-sm text-slate-600 flex-wrap">
                            <span>{new Date(purchase.purchase_date).toLocaleString()}</span>
                            {purchase.invoice_number && <span>Invoice: {purchase.invoice_number}</span>}
                            {purchase.payment_method && <Badge variant="outline">{purchase.payment_method}</Badge>}
                          </div>
                          {purchase.receipt_url && <a {...fileLinkProps(purchase.receipt_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-1">📎 View receipt</a>}
                          {purchase.paid_date && <p className="text-xs text-green-600 mt-1">Paid on: {new Date(purchase.paid_date).toLocaleString()}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          <p className="text-xl font-bold text-amber-600">{formatCurrency(purchase.total_amount)}</p>
                          {purchase.payment_status === "pending_payment" && (permissions?.cashier_audit_view || permissions?.finance_edit) && (
                            <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 text-xs"
                              disabled={updatingPurchase === purchase.id}
                              onClick={async () => {
                                setUpdatingPurchase(purchase.id);
                                await base44.entities.CashierPurchase.update(purchase.id, { payment_status: "paid_now", paid_date: new Date().toISOString() });
                                queryClient.invalidateQueries({ queryKey: ["cashierPurchases"] });
                                toast.success("Marked as paid");
                                setUpdatingPurchase(null);
                              }}>
                              {updatingPurchase === purchase.id ? "Saving..." : "Mark as Paid"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-amber-900">Total Purchases (Approved):</span>
                      <span className="text-2xl font-bold text-amber-600">{formatCurrency(totalPurchases)}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* DEPOSITS TAB */}
          <TabsContent value="deposits" className="space-y-3">
            {deposits.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-slate-500">No deposits in this session</CardContent></Card>
            ) : (
              <>
                {deposits.map(deposit => (
                  <Card key={deposit.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{deposit.description || "Deposit"}</p>
                          <div className="flex gap-3 text-sm text-slate-600 flex-wrap mt-1">
                            <span>{new Date(deposit.deposit_date || deposit.created_date).toLocaleString()}</span>
                            {deposit.payment_method && <Badge variant="outline">{deposit.payment_method}</Badge>}
                            {deposit.submitted_by && <span>By: {deposit.submitted_by}</span>}
                          </div>
                          {deposit.notes && <p className="text-xs text-slate-500 mt-1">{deposit.notes}</p>}
                        </div>
                        <p className="text-xl font-bold text-green-600 ml-3">+{formatCurrency(deposit.amount)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-green-900">Total Deposits:</span>
                      <span className="text-2xl font-bold text-green-600">+{formatCurrency(totalDeposits)}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ORDER AUDIT TAB */}
          {canViewAudit && (
            <TabsContent value="order-audit" className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Order Modification Audit Trail</h3>
                <p className="text-sm text-slate-500">All changes made to orders in this session — payment changes, cancellations, deletions.</p>
              </div>
              <OrderAuditLogViewer sessionId={viewingSession?.id} />
            </TabsContent>
          )}

          {/* RETURNS TAB */}
          <TabsContent value="returns" className="space-y-3">
            {returns.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-slate-500">No returns in this session</CardContent></Card>
            ) : (
              <>
                {returns.map(ret => (
                  <Card key={ret.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{ret.customer_name || ret.reason || "Return"}</p>
                          <div className="flex gap-3 text-sm text-slate-600 flex-wrap mt-1">
                            <span>{new Date(ret.return_date || ret.created_date).toLocaleString()}</span>
                            {ret.payment_method && <Badge variant="outline">{ret.payment_method}</Badge>}
                            {ret.status && <Badge variant={ret.status === "approved" ? "default" : "secondary"}>{ret.status}</Badge>}
                          </div>
                          {ret.reason && <p className="text-xs text-slate-500 mt-1">Reason: {ret.reason}</p>}
                          {ret.notes && <p className="text-xs text-slate-500 mt-1">{ret.notes}</p>}
                        </div>
                        <p className="text-xl font-bold text-orange-600 ml-3">-{formatCurrency(ret.amount)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-orange-900">Total Returns:</span>
                      <span className="text-2xl font-bold text-orange-600">-{formatCurrency(totalReturns)}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}