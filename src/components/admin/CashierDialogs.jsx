import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { base44 } from "@/api/base44Client";
import ReceiptLink from "@/components/shared/ReceiptLink";
import { uploadPrivateReceipt } from "@/lib/privateFiles";
import { toast } from "sonner";
import SessionReconciliation from "./SessionReconciliation";
import SessionClosingReport from "./SessionClosingReport";
import ClosedSessionDialog from "./ClosedSessionDialog";
import PurchaseDialog from "@/components/pos/PurchaseDialog";

export default function CashierDialogs({
  // Session dialogs
  openSessionDialog, setOpenSessionDialog,
  closeSessionDialog, setCloseSessionDialog,
  reconciliationDialog, setReconciliationDialog,
  openingCash, setOpeningCash,
  closingCash, setClosingCash,
  closingCashTemp,
  sessionNotes, setSessionNotes,
  handleOpenSession, handleInitiateClose, handleConfirmClose,
  createSessionMutation, updateSessionMutation,
  // Expense dialog
  expenseDialog, setExpenseDialog,
  expenseData, setExpenseData,
  uploadingExpenseReceipt, setUploadingExpenseReceipt,
  handleAddExpense, createExpenseMutation,
  // Order details dialog
  orderDetailsDialog, setOrderDetailsDialog,
  selectedOrder,
  editingPaymentMethod, setEditingPaymentMethod,
  newPaymentMethod, setNewPaymentMethod,
  handleUpdatePaymentMethod, deleteOrderMutation,
  clients,
  // Return dialog
  returnDialog, setReturnDialog,
  returnData, setReturnData,
  handleAddReturn, createReturnMutation,
  orders,
  // Deposit dialog
  depositDialog, setDepositDialog,
  depositData, setDepositData,
  handleAddDeposit, createDepositMutation,
  // Session data
  openSession, expenses, purchases, deposits, returns, visaCredits, deliveryCompanies,
  // Closed session dialog
  viewSessionDialog, setViewSessionDialog, viewingSession,
  // Purchase dialog
  purchaseDialog, setPurchaseDialog,
  createPurchaseMutation,
  getCairoNow, currentUser,
}) {
  return (
    <>
      {/* Open Session Dialog */}
      <Dialog open={openSessionDialog} onOpenChange={setOpenSessionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open Cashier Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Opening Cash (EGP)</Label>
              <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="Enter starting cash amount" />
            </div>
            <Button onClick={handleOpenSession} disabled={createSessionMutation.isPending} className="w-full">Open Session</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Session Dialog */}
      <Dialog open={closeSessionDialog} onOpenChange={setCloseSessionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close Cashier Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Closing Cash (EGP)</Label>
              <Input type="number" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="Enter final cash amount in drawer" />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Input value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="Any notes about the session" />
            </div>
            <Button onClick={handleInitiateClose} disabled={updateSessionMutation.isPending} className="w-full">Review & Close Session</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={expenseData.category} onValueChange={(v) => setExpenseData({...expenseData, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="salaries">Salaries</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (EGP)</Label><Input type="number" value={expenseData.amount} onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})} /></div>
            <div><Label>Description</Label><Input value={expenseData.description} onChange={(e) => setExpenseData({...expenseData, description: e.target.value})} /></div>
            <div><Label>Recipient</Label><Input value={expenseData.recipient} onChange={(e) => setExpenseData({...expenseData, recipient: e.target.value})} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={expenseData.payment_method} onValueChange={(v) => setExpenseData({...expenseData, payment_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Receipt Scan* <span className="text-red-500">(Required)</span></Label>
              <div className="flex gap-2">
                <Input value={expenseData.receipt_url} onChange={(e) => setExpenseData({...expenseData, receipt_url: e.target.value})} placeholder="Receipt URL" className="flex-1" readOnly />
                <Button variant="outline" onClick={() => document.getElementById("expense-receipt-upload").click()} disabled={uploadingExpenseReceipt}>
                  {uploadingExpenseReceipt ? "Uploading..." : "Upload"}
                </Button>
                <input id="expense-receipt-upload" type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setUploadingExpenseReceipt(true);
                    try {
                      const file_url = await uploadPrivateReceipt(file);
                      setExpenseData({...expenseData, receipt_url: file_url});
                      toast.success("Receipt uploaded");
                    } catch { toast.error("Failed to upload receipt"); }
                    finally { setUploadingExpenseReceipt(false); }
                  }}
                />
              </div>
              <ReceiptLink value={expenseData.receipt_url} className="text-xs text-blue-600 hover:underline block mt-1">View uploaded receipt</ReceiptLink>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <p className="font-semibold mb-1">⚠️ Approval Required</p>
              <p>This expense will be submitted for admin approval before reflecting in the session.</p>
            </div>
            <Button onClick={handleAddExpense} disabled={createExpenseMutation.isPending} className="w-full">Submit Expense for Approval</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsDialog} onOpenChange={(open) => { setOrderDetailsDialog(open); if (!open) { setEditingPaymentMethod(false); setNewPaymentMethod(""); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-slate-600">Date & Time</p><p className="font-semibold">{new Date(selectedOrder.created_date).toLocaleString()}</p></div>
                <div><p className="text-sm text-slate-600">Order Type</p><p className="font-semibold capitalize">{selectedOrder.order_type?.replace('_', ' ')}</p></div>
                <div><p className="text-sm text-slate-600">Customer Name</p><p className="font-semibold">{selectedOrder.customer_name || "N/A"}</p></div>
                <div><p className="text-sm text-slate-600">Mobile Number</p><p className="font-semibold">{clients.find(c => c.id === selectedOrder.customer_id)?.phone || "N/A"}</p></div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600 mb-2">Payment Method</p>
                  {!editingPaymentMethod ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">{selectedOrder.payment_method}</Badge>
                      {!selectedOrder.is_returned && (
                        <Button variant="ghost" size="sm" onClick={() => { setEditingPaymentMethod(true); setNewPaymentMethod(selectedOrder.payment_method); }} className="text-xs">Edit</Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="visa">Visa</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                          <SelectItem value="instapay">Instapay</SelectItem>
                          <SelectItem value="cashback_balance">Cashback</SelectItem>
                          <SelectItem value="recharge_balance">Recharge</SelectItem>
                          <SelectItem value="cl">CL</SelectItem>
                          <SelectItem value="hospitality">Hospitality</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleUpdatePaymentMethod} className="bg-green-600 hover:bg-green-700">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingPaymentMethod(false); setNewPaymentMethod(""); }}>Cancel</Button>
                    </div>
                  )}
                </div>
                <div><p className="text-sm text-slate-600">Status</p><Badge variant="outline" className="capitalize">{selectedOrder.status}</Badge></div>
                {selectedOrder.table_number && <div><p className="text-sm text-slate-600">Table</p><p className="font-semibold">{selectedOrder.table_number}</p></div>}
                {selectedOrder.cashback_used > 0 && <div><p className="text-sm text-slate-600">Cashback Used</p><p className="font-semibold text-green-600">{formatCurrency(selectedOrder.cashback_used)}</p></div>}
                {selectedOrder.recharge_balance_before !== undefined && (
                  <>
                    <div><p className="text-sm text-slate-600">Balance Before</p><p className="font-semibold text-blue-600">{formatCurrency(selectedOrder.recharge_balance_before)}</p></div>
                    <div><p className="text-sm text-slate-600">Amount Deducted</p><p className="font-semibold text-red-600">-{formatCurrency(selectedOrder.recharge_balance_deducted)}</p></div>
                    <div><p className="text-sm text-slate-600">Balance After</p><p className="font-semibold text-green-600">{formatCurrency(selectedOrder.recharge_balance_after)}</p></div>
                  </>
                )}
              </div>
              <div className="border-t pt-4">
                <p className="font-semibold mb-3">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start bg-slate-50 p-3 rounded">
                      <div><p className="font-medium">{item.name}</p><p className="text-sm text-slate-600">Qty: {item.quantity}</p></div>
                      <p className="font-semibold">{((item.price + (item.option_price_modifier || 0)) * item.quantity).toFixed(2)} EGP</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-semibold">{formatCurrency(selectedOrder.subtotal)}</span></div>
                {selectedOrder.service_charge > 0 && <div className="flex justify-between"><span className="text-slate-600">Service</span><span className="font-semibold">{formatCurrency(selectedOrder.service_charge)}</span></div>}
                {selectedOrder.tax > 0 && <div className="flex justify-between"><span className="text-slate-600">Tax</span><span className="font-semibold">{formatCurrency(selectedOrder.tax)}</span></div>}
                {selectedOrder.delivery_fee > 0 && <div className="flex justify-between"><span className="text-slate-600">Delivery</span><span className="font-semibold">{formatCurrency(selectedOrder.delivery_fee)}</span></div>}
                {selectedOrder.discount_amount > 0 && <div className="flex justify-between"><span className="text-slate-600">Discount</span><span className="font-semibold text-green-600">-{formatCurrency(selectedOrder.discount_amount)}</span></div>}
                <div className="flex justify-between text-lg pt-2 border-t"><span className="font-bold">Total</span><span className="font-bold">{formatCurrency(selectedOrder.total)}</span></div>
              </div>
              {!selectedOrder.is_returned && (
                <div className="border-t pt-4">
                  <Button variant="destructive" className="w-full" onClick={() => { if (confirm(`Delete order #${selectedOrder.id.slice(0, 8).toUpperCase()}? This will revert all session totals.`)) { deleteOrderMutation.mutate(selectedOrder); } }} disabled={deleteOrderMutation.isPending}>
                    <X className="w-4 h-4 mr-2" />Delete Order
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialog} onOpenChange={setReturnDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Order*</Label>
              <Select value={returnData.order_id} onValueChange={(v) => setReturnData({...returnData, order_id: v, refund_amount: orders.find(o => o.id === v)?.total || ""})}>
                <SelectTrigger><SelectValue placeholder="Select order to return" /></SelectTrigger>
                <SelectContent>
                  {orders.map(order => (
                    <SelectItem key={order.id} value={order.id}>#{order.id.slice(0, 8).toUpperCase()} - {formatCurrency(order.total)} ({order.payment_method})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Refund Amount (EGP)*</Label><Input type="number" value={returnData.refund_amount} onChange={(e) => setReturnData({...returnData, refund_amount: e.target.value})} /></div>
            <div><Label>Reason*</Label><Input value={returnData.reason} onChange={(e) => setReturnData({...returnData, reason: e.target.value})} placeholder="e.g., Customer complaint, defective item" /></div>
            <div><Label>Notes (Optional)</Label><Input value={returnData.notes} onChange={(e) => setReturnData({...returnData, notes: e.target.value})} /></div>
            <Button onClick={handleAddReturn} disabled={createReturnMutation.isPending} className="w-full bg-red-600 hover:bg-red-700">Record Return</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={depositDialog} onOpenChange={setDepositDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Deposit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Amount (EGP)</Label><Input type="number" value={depositData.amount} onChange={(e) => setDepositData({...depositData, amount: e.target.value})} /></div>
            <div><Label>Source*</Label><Input value={depositData.source} onChange={(e) => setDepositData({...depositData, source: e.target.value})} placeholder="e.g., Owner contribution, Bank deposit" /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={depositData.payment_method} onValueChange={(v) => setDepositData({...depositData, payment_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference Number (Optional)</Label><Input value={depositData.reference_number} onChange={(e) => setDepositData({...depositData, reference_number: e.target.value})} placeholder="Check #, transaction ID, etc." /></div>
            <div><Label>Notes (Optional)</Label><Input value={depositData.notes} onChange={(e) => setDepositData({...depositData, notes: e.target.value})} /></div>
            <Button onClick={handleAddDeposit} disabled={createDepositMutation.isPending} className="w-full">Record Deposit</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Dialog */}
      <Dialog open={reconciliationDialog} onOpenChange={setReconciliationDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Verify Cash Reconciliation Before Closing</DialogTitle></DialogHeader>
          {openSession && (
            <div className="space-y-4">
              <SessionReconciliation
                session={openSession}
                cashSales={orders.filter(o => ["cash", "cl"].includes(o.payment_method)).reduce((sum, o) => sum + (o.total || 0), 0) + orders.filter(o => o.payment_method === "visa_cash").reduce((sum, o) => sum + (o.secondary_amount || 0), 0)}
                depositTotal={deposits.reduce((sum, d) => sum + (d.amount || 0), 0)}
                visaCredits={visaCredits.filter(v => v.payment_method === "cash").reduce((sum, v) => sum + (v.amount || 0), 0)}
                newRechargeCash={openSession?.new_recharge_cash || 0}
                expenses={expenses.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + (e.amount || 0), 0)}
                returns={returns.filter(r => r.payment_method === "cash").reduce((sum, r) => sum + (r.refund_amount || 0), 0)}
                closingCash={parseFloat(closingCashTemp)}
                expectedCash={(openSession.opening_cash || 0) + orders.filter(o => o.payment_method === "cash").reduce((sum, o) => sum + (o.total || 0), 0) + orders.filter(o => o.payment_method === "visa_cash").reduce((sum, o) => sum + (o.secondary_amount || 0), 0) + orders.filter(o => o.payment_method === "instapay").reduce((sum, o) => sum + (o.total || 0), 0) + orders.filter(o => o.payment_method === "visa_instapay").reduce((sum, o) => sum + (o.secondary_amount || 0), 0) + orders.filter(o => o.payment_method === "cl").reduce((sum, o) => sum + (o.total || 0), 0) + deposits.reduce((sum, d) => sum + (d.amount || 0), 0) + (openSession?.new_recharge_cash || 0) - expenses.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + (e.amount || 0), 0) - purchases.filter(p => p.payment_method === "cash" && p.payment_status !== "pending_payment").reduce((sum, p) => sum + (p.total_amount || 0), 0) - returns.filter(r => r.payment_method === "cash").reduce((sum, r) => sum + (r.refund_amount || 0), 0)}
                difference={parseFloat(closingCashTemp) - ((openSession.opening_cash || 0) + orders.filter(o => o.payment_method === "cash").reduce((sum, o) => sum + (o.total || 0), 0) + orders.filter(o => o.payment_method === "visa_cash").reduce((sum, o) => sum + (o.secondary_amount || 0), 0) + orders.filter(o => o.payment_method === "instapay").reduce((sum, o) => sum + (o.total || 0), 0) + orders.filter(o => o.payment_method === "visa_instapay").reduce((sum, o) => sum + (o.secondary_amount || 0), 0) + orders.filter(o => o.payment_method === "cl").reduce((sum, o) => sum + (o.total || 0), 0) + deposits.reduce((sum, d) => sum + (d.amount || 0), 0) + (openSession?.new_recharge_cash || 0) - expenses.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + (e.amount || 0), 0) - purchases.filter(p => p.payment_method === "cash" && p.payment_status !== "pending_payment").reduce((sum, p) => sum + (p.total_amount || 0), 0) - returns.filter(r => r.payment_method === "cash").reduce((sum, r) => sum + (r.refund_amount || 0), 0))}
              />
              <SessionClosingReport
                session={openSession} orders={orders} expenses={expenses} visaCredits={visaCredits} deposits={deposits} returns={returns} purchases={purchases}
                rechargeBalance={openSession?.new_recharge_cash || 0} deliveryCompanies={deliveryCompanies}
                cashSales={orders.filter(o => ["cash", "cl"].includes(o.payment_method)).reduce((sum, o) => sum + (o.total || 0), 0) + orders.filter(o => o.payment_method === "visa_cash").reduce((sum, o) => sum + (o.secondary_amount || 0), 0)}
                cardSales={orders.filter(o => ["visa", "card", "stripe"].includes(o.payment_method)).reduce((sum, o) => sum + (o.total || 0), 0) + orders.filter(o => ["visa_cash", "visa_instapay"].includes(o.payment_method)).reduce((sum, o) => sum + (o.visa_amount || 0), 0)}
                walletSales={orders.filter(o => ["wallet", "instapay", "cashback_balance"].includes(o.payment_method)).reduce((sum, o) => sum + (o.total || 0), 0) + orders.filter(o => o.payment_method === "visa_instapay").reduce((sum, o) => sum + (o.secondary_amount || 0), 0)}
              />
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setReconciliationDialog(false)} className="flex-1">Back to Edit</Button>
                <Button onClick={handleConfirmClose} disabled={updateSessionMutation.isPending} className="flex-1">Confirm & Close Session</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ClosedSessionDialog open={viewSessionDialog} onOpenChange={setViewSessionDialog} viewingSession={viewingSession} />

      <PurchaseDialog
        open={purchaseDialog}
        onOpenChange={setPurchaseDialog}
        isSubmitting={createPurchaseMutation.isPending}
        onSubmit={(data) => {
          if (!openSession) { toast.error("Please open a cashier session first"); return; }
          createPurchaseMutation.mutate({
            session_id: openSession.id,
            branch_id: openSession.branch_id,
            branch_name: openSession.branch_name,
            purchase_date: getCairoNow().toISOString(),
            ...data,
            total_amount: parseFloat(data.total_amount),
            status: "pending",
            submitted_by: currentUser?.full_name || currentUser?.email
          });
        }}
      />
    </>
  );
}