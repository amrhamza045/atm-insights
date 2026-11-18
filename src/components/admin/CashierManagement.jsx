import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fileLinkProps } from "@/lib/privateFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, ShoppingCart, Plus, X, ArrowDown, RotateCcw, ShieldAlert, RefreshCw } from "lucide-react";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useBranch } from "@/components/branches/BranchContext";
import { toast } from "sonner";
import { getCairoNow, isOrderInSession } from "@/components/utils/timezoneHelper";
import CashierGroupedOrders from "./CashierGroupedOrders";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import ApprovalsCenterNotice from "@/components/approvals/ApprovalsCenterNotice";
import SessionReports from "./SessionReports";
import SupplierPaymentManagement from "./SupplierPaymentManagement";
import CashierDialogs from "./CashierDialogs";
import CashierAuditLog from "./CashierAuditLog";
import OrderAuditLogViewer from "./OrderAuditLogViewer";
import SessionDebugPanel from "./SessionDebugPanel";

function SessionDebugPanelCollapsible({ openSession, orders }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="border-t border-green-200 pt-2">
      <button
        className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-900 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span>{expanded ? "▾" : "▸"}</span>
        Session &amp; Delivery Debug
      </button>
      {expanded && <div className="mt-2"><SessionDebugPanel openSession={openSession} orders={orders} /></div>}
    </div>
  );
}
import { logCashierAction } from "@/components/utils/auditLogHelper";

export default function CashierManagement() {
  const screenTabs = useScreenTabs("Cashier");
  const [openSessionDialog, setOpenSessionDialog] = useState(false);
  const [closeSessionDialog, setCloseSessionDialog] = useState(false);
  const [reconciliationDialog, setReconciliationDialog] = useState(false);
  const [closingCashTemp, setClosingCashTemp] = useState("");
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const [depositDialog, setDepositDialog] = useState(false);
  const [returnDialog, setReturnDialog] = useState(false);
  const [orderDetailsDialog, setOrderDetailsDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ordersTab, setOrdersTab] = useState("all");
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [expenseData, setExpenseData] = useState({ category: "other", amount: "", description: "", recipient: "", payment_method: "cash", receipt_url: "" });
  const [uploadingExpenseReceipt, setUploadingExpenseReceipt] = useState(false);
  const [depositData, setDepositData] = useState({ amount: "", payment_method: "cash", source: "", reference_number: "", notes: "" });
  const [returnData, setReturnData] = useState({ order_id: "", refund_amount: "", reason: "", notes: "" });
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [viewSessionDialog, setViewSessionDialog] = useState(false);
  const [viewingSession, setViewingSession] = useState(null);

  const queryClient = useQueryClient();
  const { permissions } = usePermissions();
  const isSuperAdmin = useIsAdmin();
  const { branches, selectedBranch, selectedBranchId } = useBranch();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["cashierSessions", selectedBranchId, currentUser?.role, isSuperAdmin],
    queryFn: async () => {
      // Admins always see all sessions regardless of branch selection
      if (isSuperAdmin) {
        return await base44.entities.CashierSession.list("-created_date");
      }
      // Regular users see only their branch sessions
      if (selectedBranchId) {
        return await base44.entities.CashierSession.filter({ branch_id: selectedBranchId }, "-created_date");
      }
      // Fallback: list all if no branch selected
      return await base44.entities.CashierSession.list("-created_date");
    }
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date")
  });

  const { data: allVisaCredits = [] } = useQuery({
    queryKey: ["visaCredits"],
    queryFn: () => base44.entities.VisaCredit.list("-credit_date")
  });

  const { data: allPurchases = [] } = useQuery({
    queryKey: ["cashierPurchases"],
    queryFn: () => base44.entities.CashierPurchase.list("-purchase_date")
  });

  const { data: allDeposits = [] } = useQuery({
    queryKey: ["deposits"],
    queryFn: () => base44.entities.Deposit.list("-deposit_date")
  });

  const { data: allReturns = [] } = useQuery({
    queryKey: ["returns"],
    queryFn: () => base44.entities.Return.list("-return_date")
  });

  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: allCashbackTransactions = [] } = useQuery({
    queryKey: ["cashbackTransactions"],
    queryFn: () => base44.entities.CashbackTransaction.list("-created_date")
  });

  // super_admin resolves to every flag granted, so the flag alone is sufficient.
  const canViewAudit = !!permissions?.cashier_audit_view;
  const canApprovePending = isSuperAdmin || !!permissions?.finance_edit || !!permissions?.admin_operations;
  // History tabs closed in Admin › Modules are left out; the first open one is shown first.
  const firstHistoryTab = screenTabs.pick("orders", ["orders", "solditems", "delivery", "returns", ...(canApprovePending ? ["pending"] : []), "reports", "sessions", "deposits", "expenses", "purchases", ...(canViewAudit ? ["audit"] : []), ...(isSuperAdmin ? ["order-audit"] : [])]);

  const openSession = sessions.find(s => s.status === "open");

  // Keep a stable ref to openSession to avoid disabling the todayOrders query during sessions refetch
  const openSessionRef = React.useRef(openSession);
  if (openSession) openSessionRef.current = openSession;
  const stableOpenSession = openSession || openSessionRef.current;

  // Real-time subscription: auto-refresh orders when any order is created or updated
  useEffect(() => {
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.type === "create" || event.type === "update") {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["todayOrders"], exact: false });
          queryClient.refetchQueries({ queryKey: ["todayOrders"], exact: false });
        }, 800);
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // Filter for current session only (only approved items count in totals)
  const expenses = openSession ? allExpenses.filter(e => e.session_id === openSession.id && e.status === "approved") : [];
  const visaCredits = openSession ? allVisaCredits.filter(v => v.session_id === openSession.id) : [];
  const purchases = openSession ? allPurchases.filter(p => p.session_id === openSession.id && p.status === "approved") : [];
  const deposits = openSession ? allDeposits.filter(d => d.session_id === openSession.id) : [];
  const returns = openSession ? allReturns.filter(r => r.session_id === openSession.id) : [];

  // Pending approvals for current session
  const pendingExpenses = openSession ? allExpenses.filter(e => e.session_id === openSession.id && e.status === "pending") : [];
  const pendingPurchases = openSession ? allPurchases.filter(p => p.session_id === openSession.id && p.status === "pending") : [];

  // Only paid/completed/returned orders count toward sales — pending/preparing/ready are excluded
  // This derived array is used for all sales calculations; full `orders` array is used for UI display
  const getPaidOrders = (ordersArr) => ordersArr.filter(o => ["paid", "completed", "returned"].includes(o.status));

  const { data: orders = [], refetch: refetchOrders } = useQuery({
     queryKey: ["todayOrders", stableOpenSession?.id],
     queryFn: async () => {
       if (!stableOpenSession) return [];
       // Normalize timestamps: ensure Z suffix so they're treated as UTC, not local
       const normalizeUTC = (ts) => ts && !ts.endsWith('Z') && !ts.includes('+') ? ts + 'Z' : ts;
       const openTime = new Date(normalizeUTC(stableOpenSession.opening_time)).getTime();
       const closeTime = stableOpenSession.closing_time ? new Date(normalizeUTC(stableOpenSession.closing_time)).getTime() : Date.now() + 86400000;

       // Fetch all orders from the session date forward (filter by session_date string prefix)
       const sessionDate = stableOpenSession.session_date; // e.g. "2026-04-04"

       let allOrders = [];
       let skip = 0;
       const batchSize = 200;
       while (true) {
         const batch = await base44.entities.Order.list("-created_date", batchSize, skip);
         if (!batch || batch.length === 0) break;
         allOrders = allOrders.concat(batch);
         // Stop once we've gone more than 2 days before the session date
         const oldestInBatch = new Date(batch[batch.length - 1].created_date);
         const sessionDateObj = new Date(sessionDate + "T00:00:00.000Z");
         if (oldestInBatch < new Date(sessionDateObj.getTime() - 2 * 86400000)) break;
         if (batch.length < batchSize) break;
         skip += batchSize;
       }

       const filtered = allOrders.filter(o => {
         const t = new Date(normalizeUTC(o.created_date)).getTime();
         const inTimeWindow = t >= openTime && t <= closeTime;
         const validStatus = ["paid", "completed", "returned", "pending", "preparing", "ready"].includes(o.status);
         return inTimeWindow && validStatus;
       });
       return filtered;
     },
     enabled: !!stableOpenSession,
     staleTime: 0,
     gcTime: 0,
     refetchInterval: 15000
   });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.CashierSession.create(data),
    onSuccess: (newSession, data) => {
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
      toast.success("Cashier session opened");
      setOpenSessionDialog(false);
      setOpeningCash("");
      logCashierAction("session_opened", `Session opened by ${currentUser?.full_name || currentUser?.email} with opening cash ${formatCurrency(data.opening_cash)}`, { entityId: newSession.id, entityName: `Session ${data.session_date}`, changes: { opening_cash: data.opening_cash } });
    }
  });

  const recomputeSession = (sessionId) =>
    base44.functions.invoke("updateCashierSession", { session_id: sessionId, action: "recompute" });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, closing_cash, notes }) => {
      const res = await base44.functions.invoke("updateCashierSession", { session_id: id, action: "close", closing_cash, notes });
      return res.data.session;
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
      toast.success("Cashier session updated");
      if (data?.status === "closed") {
        logCashierAction("session_closed", `Session closed by ${currentUser?.full_name || currentUser?.email}. Total sales: ${formatCurrency(data.total_sales)}, Cash diff: ${formatCurrency(data.cash_difference)}`, { entityId: id, entityName: `Session ${data.closing_time?.split('T')[0]}`, changes: { total_sales: data.total_sales, closing_cash: data.closing_cash, expected_cash: data.expected_cash, cash_difference: data.cash_difference } });
      }
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense recorded");
      setExpenseDialog(false);
      resetExpenseForm();
    }
  });

  const createPurchaseMutation = useMutation({
    mutationFn: (data) => base44.entities.CashierPurchase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashierPurchases"] });
      toast.success("Purchase recorded");
      setPurchaseDialog(false);
    }
  });

  const createDepositMutation = useMutation({
    mutationFn: (data) => base44.entities.Deposit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("Deposit recorded");
      setDepositDialog(false);
      resetDepositForm();
    }
  });

  const createReturnMutation = useMutation({
    mutationFn: (data) => base44.entities.Return.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["todayOrders"] });
      toast.success("Return recorded");
      setReturnDialog(false);
      resetReturnForm();
    }
  });

  const deleteReturnMutation = useMutation({
    mutationFn: async (returnRecord) => {
      // Restore order status
      await base44.entities.Order.update(returnRecord.order_id, {
        status: "paid",
        is_returned: false,
        return_id: null
      });

      // Delete return record, then let the server recalculate session totals
      await base44.entities.Return.delete(returnRecord.id);
      if (openSession) await recomputeSession(openSession.id);
    },
    onSuccess: (_, returnRecord) => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["todayOrders"] });
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
      toast.success("Return deleted and order restored");
      logCashierAction("return_deleted", `Return DELETED for order ${returnRecord.order_reference} — ${formatCurrency(returnRecord.refund_amount)} restored to session`, { entityId: returnRecord.id, entityName: returnRecord.order_reference, changes: { refund_amount: returnRecord.refund_amount, reason: returnRecord.reason } });
    },
    onError: (error) => {
      toast.error("Failed to delete return: " + error.message);
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (order) => {
      // Delete order, then let the server recalculate session totals
      await base44.entities.Order.delete(order.id);
      if (openSession) await recomputeSession(openSession.id);
    },
    onSuccess: (_, order) => {
      queryClient.invalidateQueries({ queryKey: ["todayOrders"] });
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
      setOrderDetailsDialog(false);
      toast.success("Order deleted and session totals updated");
      logCashierAction("order_deleted", `Order #${order.id.slice(0,8).toUpperCase()} DELETED — ${formatCurrency(order.total)} (${order.payment_method}) for ${order.customer_name}`, { entityId: order.id, entityName: `Order #${order.id.slice(0,8).toUpperCase()}`, changes: { total: order.total, payment_method: order.payment_method, customer: order.customer_name, items: order.items?.length } });
    base44.entities.OrderChangeLog.create({ order_id: order.id, order_reference: `#${order.id.slice(0,8).toUpperCase()}`, session_id: openSession?.id, change_type: "order_deleted", previous_value: order.status, new_value: "deleted", order_total: order.total, customer_name: order.customer_name, table_number: order.table_number, cashier_name: currentUser?.full_name || currentUser?.email, cashier_email: currentUser?.email, details: `Order deleted — ${order.payment_method} — ${order.items?.length || 0} items` }).catch(() => {});
    },
    onError: (error) => {
      toast.error("Failed to delete order: " + error.message);
    }
  });



  const resetExpenseForm = () => setExpenseData({ category: "other", amount: "", description: "", recipient: "", payment_method: "cash", receipt_url: "" });
  const resetDepositForm = () => setDepositData({ amount: "", payment_method: "cash", source: "", reference_number: "", notes: "" });
  const resetReturnForm = () => setReturnData({ order_id: "", refund_amount: "", reason: "", notes: "" });

  const handleOpenSession = () => {
    if (!openingCash || parseFloat(openingCash) < 0) {
      toast.error("Please enter valid opening cash");
      return;
    }
    // Session branch: the cashier's assigned branch, else the branch picked on this screen.
    const branchId = currentUser?.perm_branch_id || currentUser?.data?.perm_branch_id || selectedBranchId;
    const branch = branches.find((b) => b.id === branchId);
    if (!branchId || !branch) {
      toast.error("Select a branch before opening a session");
      return;
    }

    createSessionMutation.mutate({
       session_date: new Date().toISOString().split('T')[0],
       cashier_id: currentUser?.id,
       cashier_name: currentUser?.full_name || currentUser?.email,
       opening_time: new Date().toISOString(), // always store as UTC (with Z)
       opening_cash: parseFloat(openingCash),
       status: "open",
       branch_id: branch.id,
       branch_name: branch.name
     });
  };

  const handleInitiateClose = () => {
    if (!closingCash || parseFloat(closingCash) < 0) {
      toast.error("Please enter valid closing cash");
      return;
    }

    const unfinishedOrders = orders.filter(o => !["paid", "completed", "returned", "cancelled"].includes(o.status));
    if (unfinishedOrders.length > 0) {
      toast.error(`Cannot close session: ${unfinishedOrders.length} unfinished order(s) still open. Please resolve them first.`);
      return;
    }

    setClosingCashTemp(closingCash);
    setReconciliationDialog(true);
  };

  const handleConfirmClose = async () => {
    const actualClosing = parseFloat(closingCashTemp);

    // Close all orders in this session
    for (const order of orders) {
      if (order.status !== "cancelled" && order.status !== "completed") {
        await base44.entities.Order.update(order.id, { status: "completed" });
      }
    }

    // Totals, expected cash and the difference are calculated on the server
    updateSessionMutation.mutate({ id: openSession.id, closing_cash: actualClosing, notes: sessionNotes });

    setCloseSessionDialog(false);
    setReconciliationDialog(false);
    setClosingCash("");
    setClosingCashTemp("");
    setSessionNotes("");
    toast.success("Session closed successfully");
  };

  const handleAddExpense = () => {
    if (!openSession) {
      toast.error("Please open a cashier session first");
      return;
    }

    if (!expenseData.amount || !expenseData.description || !expenseData.receipt_url) {
      toast.error("Please fill in all required fields including receipt");
      return;
    }

    createExpenseMutation.mutate({
      session_id: openSession.id,
      expense_date: getCairoNow().toISOString(),
      ...expenseData,
      amount: parseFloat(expenseData.amount),
      status: "pending",
      submitted_by: currentUser?.full_name || currentUser?.email,
      branch_id: openSession.branch_id,
      branch_name: openSession.branch_name
    });
  };

  const handleAddDeposit = () => {
    if (!openSession) {
      toast.error("Please open a cashier session first");
      return;
    }

    if (!depositData.amount || !depositData.source) {
      toast.error("Please fill in required fields");
      return;
    }

    createDepositMutation.mutate({
      session_id: openSession.id,
      deposit_date: getCairoNow().toISOString(),
      ...depositData,
      amount: parseFloat(depositData.amount),
      branch_id: openSession.branch_id,
      branch_name: openSession.branch_name
    });
  };

  const handleUpdatePaymentMethod = async () => {
    if (!selectedOrder || !newPaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    const oldPaymentMethod = selectedOrder.payment_method;
    const orderTotal = selectedOrder.total || 0;

    if (oldPaymentMethod === newPaymentMethod) {
      toast.error("Same payment method selected");
      return;
    }

    // Update order payment method
    await base44.entities.Order.update(selectedOrder.id, {
      payment_method: newPaymentMethod
    });

    // Server recalculates session totals from the stored orders
    await recomputeSession(openSession.id);

    queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
    queryClient.invalidateQueries({ queryKey: ["todayOrders"] });
    
    setEditingPaymentMethod(false);
    setOrderDetailsDialog(false);
    toast.success("Payment method updated successfully");
    logCashierAction("order_payment_changed", `Payment method changed on order #${selectedOrder.id.slice(0,8).toUpperCase()} for ${selectedOrder.customer_name} — ${oldPaymentMethod} → ${newPaymentMethod} (${formatCurrency(orderTotal)})`, { entityId: selectedOrder.id, entityName: `Order #${selectedOrder.id.slice(0,8).toUpperCase()}`, changes: { payment_method: { before: oldPaymentMethod, after: newPaymentMethod }, amount: orderTotal } });
    base44.entities.OrderChangeLog.create({ order_id: selectedOrder.id, order_reference: `#${selectedOrder.id.slice(0,8).toUpperCase()}`, session_id: openSession?.id, change_type: "payment_method_changed", previous_value: oldPaymentMethod, new_value: newPaymentMethod, order_total: orderTotal, customer_name: selectedOrder.customer_name, table_number: selectedOrder.table_number, cashier_name: currentUser?.full_name || currentUser?.email, cashier_email: currentUser?.email, details: `Payment changed from ${oldPaymentMethod} to ${newPaymentMethod}` }).catch(() => {});
  };

  const handleAddReturn = async () => {
    if (!openSession) {
      toast.error("Please open a cashier session first");
      return;
    }

    if (!returnData.order_id || !returnData.refund_amount || !returnData.reason) {
      toast.error("Please fill in required fields");
      return;
    }

    const selectedOrder = orders.find(o => o.id === returnData.order_id);
    if (!selectedOrder) {
      toast.error("Order not found");
      return;
    }

    const refundAmount = parseFloat(returnData.refund_amount);
    const paymentMethod = selectedOrder.payment_method;

    // Create return record
    const returnRecord = await createReturnMutation.mutateAsync({
      session_id: openSession.id,
      order_id: returnData.order_id,
      order_reference: `#${selectedOrder.id.slice(0, 8).toUpperCase()}`,
      return_date: getCairoNow().toISOString(),
      original_amount: selectedOrder.total,
      refund_amount: refundAmount,
      payment_method: paymentMethod,
      reason: returnData.reason,
      notes: returnData.notes,
      status: "completed",
      branch_id: openSession.branch_id,
      branch_name: openSession.branch_name
    });

    // Mark order as returned
    await base44.entities.Order.update(returnData.order_id, {
      status: "returned",
      is_returned: true,
      return_id: returnRecord.id
    });

    // Server recalculates session totals, including the new return
    await recomputeSession(openSession.id);

    queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
    logCashierAction("return_added", `Return recorded for order #${returnData.order_id.slice(0,8).toUpperCase()} — ${formatCurrency(parseFloat(returnData.refund_amount))} (${paymentMethod}). Reason: ${returnData.reason}`, { entityId: returnData.order_id, entityName: `Return on #${returnData.order_id.slice(0,8).toUpperCase()}`, changes: { refund_amount: parseFloat(returnData.refund_amount), payment_method: paymentMethod, reason: returnData.reason } });
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cashier System</h2>
        <div className="flex gap-2">
          {!openSession ? (
            <Button onClick={() => setOpenSessionDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Open Session
            </Button>
          ) : (
            <Button onClick={() => setCloseSessionDialog(true)} variant="destructive" className="gap-2">
              <X className="w-4 h-4" />
              Close Session
            </Button>
          )}
        </div>
      </div>

      {/* Current Session Summary */}
      {openSession && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="text-green-900">Current Session</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => {
                  queryClient.removeQueries({ queryKey: ["todayOrders"], exact: false });
                  setTimeout(() => refetchOrders(), 100);
                }} className="h-6 px-2 text-green-700 hover:text-green-900">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  <span className="text-xs">Refresh Orders</span>
                </Button>
                <Badge className="bg-green-600 text-xs">OPEN</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-green-700">Opening Cash</p>
                <p className="text-lg font-bold text-green-900">{formatCurrency(openSession.opening_cash)}</p>
              </div>
              <div>
                <p className="text-xs text-green-700">Cashier</p>
                <p className="text-sm font-semibold text-green-900">{openSession.cashier_name}</p>
              </div>
              <div>
                <p className="text-xs text-green-700">Opened At</p>
                <p className="text-sm font-semibold text-green-900">
                  {new Date(openSession.opening_time).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-green-700">Duration</p>
                <p className="text-sm font-semibold text-green-900">
                  {Math.floor((new Date() - new Date(openSession.opening_time)) / 3600000)}h
                </p>
              </div>
            </div>
            
            {/* Live Sales Summary */}
            <div className="border-t border-green-200 pt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-green-700">Today's Sales <span className="text-[10px] font-normal text-green-600">(paid only)</span></p>
                {(() => { const unpaid = orders.filter(o => ["pending","preparing","ready"].includes(o.status)); return unpaid.length > 0 ? <span className="text-[10px] bg-warning-100 text-warning-700 px-2 py-0.5 rounded-full font-medium">⏳ {unpaid.length} order(s) in progress (not in totals)</span> : null; })()}
              </div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-green-600">Orders</p>
                  <p className="text-sm font-bold text-green-900">{getPaidOrders(orders).filter(o => !o.is_returned).length}</p>
                </div>
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-green-600">Cash</p>
                  <p className="text-sm font-bold text-green-900">
                    {formatCurrency(
                      getPaidOrders(orders).filter(o => o.payment_method === "cash" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                      getPaidOrders(orders).filter(o => o.payment_method === "visa_cash" && !o.is_returned).reduce((sum, o) => sum + (o.secondary_amount || 0), 0)
                    )}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-blue-600">Instapay</p>
                  <p className="text-sm font-bold text-blue-900">
                    {formatCurrency(
                      getPaidOrders(orders).filter(o => o.payment_method === "instapay" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                      getPaidOrders(orders).filter(o => o.payment_method === "visa_instapay" && !o.is_returned).reduce((sum, o) => sum + (o.secondary_amount || 0), 0)
                    )}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-green-600">Card</p>
                  <p className="text-sm font-bold text-green-900">
                    {formatCurrency(
                      getPaidOrders(orders).filter(o => ["visa", "card", "stripe"].includes(o.payment_method) && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                      getPaidOrders(orders).filter(o => ["visa_cash", "visa_instapay"].includes(o.payment_method) && !o.is_returned).reduce((sum, o) => sum + (o.visa_amount || 0), 0)
                    )}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-amber-600">CL</p>
                  <p className="text-sm font-bold text-amber-900">
                    {formatCurrency(getPaidOrders(orders).filter(o => o.payment_method === "cl" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0))}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-purple-600">Hospitality</p>
                  <p className="text-sm font-bold text-purple-900">
                    {formatCurrency(getPaidOrders(orders).filter(o => o.payment_method === "hospitality" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0))}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-green-600">Total</p>
                  <p className="text-sm font-bold text-green-900">
                    {formatCurrency(getPaidOrders(orders).filter(o => !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-2">
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-blue-600">Recharge Wallet</p>
                  <p className="text-sm font-bold text-blue-900">
                    {formatCurrency(getPaidOrders(orders).filter(o => o.payment_method === "recharge_balance" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0))}
                  </p>
                </div>
                <div className="bg-blue-100 border border-blue-300 rounded p-1.5">
                  <p className="text-[10px] font-semibold text-blue-700">New Recharge</p>
                  <p className="text-sm font-bold text-blue-900">
                    {formatCurrency((openSession?.new_recharge_cash || 0) + (openSession?.new_recharge_visa || 0))}
                  </p>
                  <p className="text-[9px] text-blue-600">
                    C: {formatCurrency(openSession?.new_recharge_cash || 0)} | V: {formatCurrency(openSession?.new_recharge_visa || 0)}
                  </p>
                </div>
                <div className="bg-purple-100 border border-purple-300 rounded p-1.5 col-span-3">
                  <p className="text-[10px] font-semibold text-purple-700">Recharge Balance Remaining</p>
                  <p className="text-base font-bold text-purple-900">
                    {formatCurrency(clients.reduce((sum, c) => sum + (c.wallet_balance || 0), 0))}
                  </p>
                  <p className="text-[9px] text-purple-600">Across all recharge users</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-blue-600">Delivery Fees</p>
                  <p className="text-sm font-bold text-blue-900">
                    {formatCurrency(getPaidOrders(orders).filter(o => !o.is_returned).reduce((sum, o) => sum + (o.delivery_fee || 0), 0))}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-purple-600">Total Tax</p>
                  <p className="text-sm font-bold text-purple-900">
                    {formatCurrency(getPaidOrders(orders).filter(o => !o.is_returned).reduce((sum, o) => sum + (o.tax || 0), 0))}
                  </p>
                </div>
                <div className="bg-white/50 rounded p-1.5">
                  <p className="text-[10px] text-purple-600">Total Service</p>
                  <p className="text-sm font-bold text-purple-900">
                    {formatCurrency(getPaidOrders(orders).filter(o => !o.is_returned).reduce((sum, o) => sum + (o.service_charge || 0), 0))}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div className="bg-warning-100 border border-warning-300 rounded p-1.5">
                  <p className="text-[10px] font-semibold text-warning-700">Cashback Generated</p>
                  <p className="text-sm font-bold text-warning-900">
                    {formatCurrency(
                      allCashbackTransactions.filter(t => 
                        openSession && 
                        isOrderInSession(t.created_date, openSession.opening_time, openSession.closing_time) &&
                        ['referral_cashback', 'self_cashback', 'welcome_cashback'].includes(t.transaction_type)
                      ).reduce((sum, t) => sum + (t.cashback_amount || 0), 0)
                    )}
                  </p>
                </div>
                <div className="bg-pink-100 border border-pink-300 rounded p-1.5">
                  <p className="text-[10px] font-semibold text-pink-700">Cashback Consumed</p>
                  <p className="text-sm font-bold text-pink-900">
                    {formatCurrency(getPaidOrders(orders).filter(o => !o.is_returned).reduce((sum, o) => sum + (o.cashback_used || 0), 0))}
                  </p>
                </div>
                <div className="bg-emerald-100 border border-emerald-300 rounded p-1.5">
                  <p className="text-[10px] font-semibold text-emerald-700">Payout Generated</p>
                  <p className="text-sm font-bold text-emerald-900">
                    {formatCurrency(
                      allCashbackTransactions.filter(t => 
                        openSession && 
                        isOrderInSession(t.created_date, openSession.opening_time, openSession.closing_time) &&
                        ['referral_cashback', 'self_cashback', 'welcome_cashback'].includes(t.transaction_type)
                      ).reduce((sum, t) => sum + (t.payout_amount || 0), 0)
                    )}
                  </p>
                </div>
                <div className="bg-teal-100 border border-teal-300 rounded p-1.5">
                  <p className="text-[10px] font-semibold text-teal-700">Payout Consumed</p>
                  <p className="text-sm font-bold text-teal-900">
                    {formatCurrency(
                      allCashbackTransactions.filter(t => 
                        openSession && 
                        isOrderInSession(t.created_date, openSession.opening_time, openSession.closing_time) &&
                        t.transaction_type === 'payout'
                      ).reduce((sum, t) => sum + (t.payout_amount || 0), 0)
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {(() => {
                  const companiesWithCommission = deliveryCompanies.filter(dc => (dc.commission_percentage || 0) > 0);
                  if (companiesWithCommission.length > 0) {
                    return (
                      <div className="bg-amber-50 border border-amber-300 rounded p-1.5">
                        <p className="text-[10px] font-semibold text-amber-700 mb-1">Delivery Companies Commission</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {companiesWithCommission.map(company => {
                            // Include both VisaCredit records and regular Orders with delivery company
                            const visaCreditOrders = visaCredits.filter(v => v.delivery_company_id === company.id || v.delivery_company === company.name);
                            const regularOrders = getPaidOrders(orders).filter(o => !o.is_returned && (o.delivery_company_id === company.id || o.delivery_company_name === company.name));
                            const totalSales = visaCreditOrders.reduce((sum, v) => sum + (v.amount || 0), 0) + 
                                              regularOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                            const commission = totalSales * ((company.commission_percentage || 0) / 100);
                            return (
                              <div key={company.id} className="bg-white/50 rounded p-1">
                                <p className="text-[9px] text-amber-600">{company.name}</p>
                                <p className="text-xs font-bold text-amber-900">
                                  {formatCurrency(commission)}
                                  <span className="text-[9px] font-normal text-amber-600 ml-0.5">({company.commission_percentage}%)</span>
                                </p>
                              </div>
                            );
                          })}
                          <div className="bg-amber-100 rounded p-1 col-span-3">
                            <p className="text-[9px] text-amber-700">Total Commission</p>
                            <p className="text-xs font-bold text-amber-900">
                              {formatCurrency(
                                companiesWithCommission.reduce((sum, company) => {
                                  const visaCreditOrders = visaCredits.filter(v => v.delivery_company_id === company.id || v.delivery_company === company.name);
                                  const regularOrders = getPaidOrders(orders).filter(o => !o.is_returned && (o.delivery_company_id === company.id || o.delivery_company_name === company.name));
                                  const totalSales = visaCreditOrders.reduce((s, v) => s + (v.amount || 0), 0) + 
                                                    regularOrders.reduce((s, o) => s + (o.total || 0), 0);
                                  return sum + (totalSales * ((company.commission_percentage || 0) / 100));
                                }, 0)
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="bg-emerald-100 border border-emerald-300 rounded p-1.5">
                  <p className="text-[10px] font-semibold text-emerald-700">Today's Income (After Returns)</p>
                  <p className="text-sm font-bold text-emerald-900">
                    {formatCurrency(
                      getPaidOrders(orders).filter(o => ["cash", "visa", "card", "stripe", "cl"].includes(o.payment_method) && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

             {/* Session & Delivery Debug — collapsible */}
             <SessionDebugPanelCollapsible openSession={openSession} orders={orders} />

             {/* Available Cash Summary */}
             <div className="border-t border-green-200 pt-2">
               <p className="text-xs font-semibold text-green-700 mb-1.5">Cash Position</p>
               <div className="grid grid-cols-6 gap-2 mb-2">
                 <div className="bg-white/50 rounded p-1.5">
                   <p className="text-[10px] text-green-600">Opening</p>
                   <p className="text-sm font-bold text-green-900">{formatCurrency(openSession.opening_cash || 0)}</p>
                 </div>
                 <div className="bg-white/50 rounded p-1.5">
                   <p className="text-[10px] text-green-600">Sales Cash</p>
                   <p className="text-sm font-bold text-green-900">
                     +{formatCurrency(
                       getPaidOrders(orders).filter(o => o.payment_method === "cash" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                       getPaidOrders(orders).filter(o => o.payment_method === "visa_cash" && !o.is_returned).reduce((sum, o) => sum + (o.secondary_amount || 0), 0)
                     )}
                   </p>
                 </div>
                 <div className="bg-white/50 rounded p-1.5">
                   <p className="text-[10px] text-blue-600">Instapay</p>
                   <p className="text-sm font-bold text-blue-900">
                     +{formatCurrency(
                       getPaidOrders(orders).filter(o => o.payment_method === "instapay" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                       getPaidOrders(orders).filter(o => o.payment_method === "visa_instapay" && !o.is_returned).reduce((sum, o) => sum + (o.secondary_amount || 0), 0)
                     )}
                   </p>
                 </div>
                 <div className="bg-white/50 rounded p-1.5">
                   <p className="text-[10px] text-amber-600">Sales CL</p>
                   <p className="text-sm font-bold text-amber-900">
                     +{formatCurrency(getPaidOrders(orders).filter(o => o.payment_method === "cl" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0))}
                   </p>
                 </div>
                 <div className="bg-white/50 rounded p-1.5">
                   <p className="text-[10px] text-green-600">Deposits</p>
                   <p className="text-sm font-bold text-green-900">
                     +{formatCurrency(deposits.reduce((sum, d) => sum + (d.amount || 0), 0))}
                   </p>
                 </div>
                 <div className="bg-blue-100 border border-blue-300 rounded p-1.5">
                   <p className="text-[10px] font-semibold text-blue-700">Recharge Cash</p>
                   <p className="text-sm font-bold text-blue-900">
                     +{formatCurrency(openSession?.new_recharge_cash || 0)}
                   </p>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-2 mb-2">
                 <div className="bg-red-50 rounded p-1.5">
                   <p className="text-[10px] text-red-600">Expenses</p>
                   <p className="text-sm font-bold text-red-900">
                     -{formatCurrency(expenses.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + (e.amount || 0), 0))}
                   </p>
                 </div>
                 <div className="bg-red-50 rounded p-1.5">
                   <p className="text-[10px] text-red-600">Purchases (Cash Paid)</p>
                   <p className="text-sm font-bold text-red-900">
                     -{formatCurrency(purchases.filter(p => p.payment_method === "cash" && p.payment_status !== "pending_payment").reduce((sum, p) => sum + (p.total_amount || 0), 0))}
                   </p>
                 </div>
                 <div className="bg-red-50 rounded p-1.5">
                   <p className="text-[10px] text-red-600">Returns</p>
                   <p className="text-sm font-bold text-red-900">
                     -{formatCurrency(returns.filter(r => r.payment_method === "cash").reduce((sum, r) => sum + (r.refund_amount || 0), 0))}
                   </p>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-2">
                 <div className="bg-green-100 border border-green-300 rounded p-1.5">
                   <p className="text-[10px] font-semibold text-green-700">Total Addition</p>
                     <p className="text-sm font-bold text-green-900">
                       {formatCurrency(
                         (openSession.opening_cash || 0) +
                         getPaidOrders(orders).filter(o => o.payment_method === "cash" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                         getPaidOrders(orders).filter(o => o.payment_method === "visa_cash" && !o.is_returned).reduce((sum, o) => sum + (o.secondary_amount || 0), 0) +
                         getPaidOrders(orders).filter(o => o.payment_method === "instapay" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                         getPaidOrders(orders).filter(o => o.payment_method === "cl" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                         deposits.reduce((sum, d) => sum + (d.amount || 0), 0) +
                         (openSession?.new_recharge_cash || 0)
                       )}
                     </p>
                   </div>
                   <div className="bg-red-100 border border-red-300 rounded p-1.5">
                     <p className="text-[10px] font-semibold text-red-700">Total Deductions</p>
                     <p className="text-sm font-bold text-red-900">
                       -{formatCurrency(
                         expenses.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + (e.amount || 0), 0) +
                         purchases.filter(p => p.payment_method === "cash" && p.payment_status !== "pending_payment").reduce((sum, p) => sum + (p.total_amount || 0), 0) +
                         returns.filter(r => r.payment_method === "cash").reduce((sum, r) => sum + (r.refund_amount || 0), 0)
                       )}
                     </p>
                   </div>
                   <div className="bg-green-100 border border-green-300 rounded p-1.5">
                     <p className="text-[10px] font-semibold text-green-700">Available Cash</p>
                     <p className="text-sm font-bold text-green-600">
                       {formatCurrency(
                         (openSession.opening_cash || 0) + 
                         getPaidOrders(orders).filter(o => o.payment_method === "cash" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                         getPaidOrders(orders).filter(o => o.payment_method === "visa_cash" && !o.is_returned).reduce((sum, o) => sum + (o.secondary_amount || 0), 0) +
                         getPaidOrders(orders).filter(o => o.payment_method === "instapay" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                         getPaidOrders(orders).filter(o => o.payment_method === "cl" && !o.is_returned).reduce((sum, o) => sum + (o.total || 0), 0) +
                         deposits.reduce((sum, d) => sum + (d.amount || 0), 0) +
                         (openSession?.new_recharge_cash || 0) -
                         expenses.filter(e => e.payment_method === "cash").reduce((sum, e) => sum + (e.amount || 0), 0) -
                         purchases.filter(p => p.payment_method === "cash" && p.payment_status !== "pending_payment").reduce((sum, p) => sum + (p.total_amount || 0), 0) -
                         returns.filter(r => r.payment_method === "cash").reduce((sum, r) => sum + (r.refund_amount || 0), 0)
                       )}
                     </p>
                   </div>
               </div>
             </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {openSession && (
        <div className="grid md:grid-cols-4 gap-4">
          <Button variant="outline" onClick={() => setDepositDialog(true)} className="h-20 gap-2">
            <ArrowDown className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <p className="font-semibold">Record Deposit</p>
              <p className="text-xs text-slate-500">Add funds to drawer</p>
            </div>
          </Button>
          <Button variant="outline" onClick={() => setExpenseDialog(true)} className="h-20 gap-2">
            <TrendingDown className="w-5 h-5" />
            <div className="text-left">
              <p className="font-semibold">Record Expense</p>
              <p className="text-xs text-slate-500">Utilities, supplies, etc.</p>
            </div>
          </Button>
          <Button variant="outline" onClick={() => setPurchaseDialog(true)} className="h-20 gap-2">
            <ShoppingCart className="w-5 h-5" />
            <div className="text-left">
              <p className="font-semibold">Record Purchase</p>
              <p className="text-xs text-slate-500">Supplier purchases</p>
            </div>
          </Button>
          <Button variant="outline" onClick={() => setReturnDialog(true)} className="h-20 gap-2">
            <RotateCcw className="w-5 h-5 text-red-600" />
            <div className="text-left">
              <p className="font-semibold">Record Return</p>
              <p className="text-xs text-slate-500">Revert transaction</p>
            </div>
          </Button>
          </div>
          )}

      {/* Tabs for History */}
      {!firstHistoryTab ? <ClosedTabsNotice /> : (
      <Tabs defaultValue={firstHistoryTab}>
        <TabsList>
          {screenTabs.isOpen("orders") && <TabsTrigger value="orders">Orders</TabsTrigger>}
          {screenTabs.isOpen("solditems") && <TabsTrigger value="solditems">Sold Items</TabsTrigger>}
          {screenTabs.isOpen("delivery") && <TabsTrigger value="delivery">Delivery Orders</TabsTrigger>}
          {screenTabs.isOpen("returns") && <TabsTrigger value="returns">Returns</TabsTrigger>}
          {canApprovePending && screenTabs.isOpen("pending") && (
          <TabsTrigger value="pending">
            Pending Approvals {(pendingExpenses.length + pendingPurchases.length) > 0 && (
              <Badge className="ml-2 bg-red-500">{pendingExpenses.length + pendingPurchases.length}</Badge>
            )}
          </TabsTrigger>
          )}
          {screenTabs.isOpen("reports") && <TabsTrigger value="reports">Reports</TabsTrigger>}
          {screenTabs.isOpen("sessions") && <TabsTrigger value="sessions">Sessions</TabsTrigger>}
          {screenTabs.isOpen("deposits") && <TabsTrigger value="deposits">Deposits</TabsTrigger>}
          {screenTabs.isOpen("expenses") && <TabsTrigger value="expenses">Expenses</TabsTrigger>}
          {screenTabs.isOpen("purchases") && <TabsTrigger value="purchases">Purchases</TabsTrigger>}
          {canViewAudit && screenTabs.isOpen("audit") && (
            <TabsTrigger value="audit" className="gap-1">
              🔍 Audit Log
            </TabsTrigger>
          )}
          {isSuperAdmin && screenTabs.isOpen("order-audit") && (
            <TabsTrigger value="order-audit" className="gap-1 text-amber-700">
              🕵️ Order Audit
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Tabs value={ordersTab} onValueChange={setOrdersTab}>
            <TabsList>
              <TabsTrigger value="grouped">Grouped View</TabsTrigger>
              <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
              {(() => { const unfinished = orders.filter(o => !["paid","completed","returned","cancelled"].includes(o.status)); return unfinished.length > 0 ? <TabsTrigger value="unfinished" className="text-warning-700"><span className="mr-1">⚠️</span>Unfinished ({unfinished.length})</TabsTrigger> : null; })()}
              <TabsTrigger value="cash">Cash ({orders.filter(o => o.payment_method === "cash").length})</TabsTrigger>
              <TabsTrigger value="card">Card ({orders.filter(o => ["visa", "card", "stripe"].includes(o.payment_method)).length})</TabsTrigger>
              <TabsTrigger value="wallet">Wallet ({orders.filter(o => ["wallet", "instapay", "cashback_balance"].includes(o.payment_method)).length})</TabsTrigger>
              <TabsTrigger value="recharge">Recharge ({orders.filter(o => o.payment_method === "recharge_balance").length})</TabsTrigger>
              <TabsTrigger value="cl">CL ({orders.filter(o => o.payment_method === "cl").length})</TabsTrigger>
              <TabsTrigger value="hospitality">Hospitality ({orders.filter(o => o.payment_method === "hospitality").length})</TabsTrigger>
            </TabsList>

            <TabsContent value="grouped" className="space-y-2 mt-4">
              {orders.length === 0 ? (<Card><CardContent className="pt-6 text-center text-slate-500">No orders yet</CardContent></Card>) : (<CashierGroupedOrders orders={orders} clients={clients} onOrderClick={(order) => { setSelectedOrder(order); setOrderDetailsDialog(true); }} />)}
            </TabsContent>

            <TabsContent value="unfinished" className="space-y-2 mt-4">
              {(() => {
                const uf = orders.filter(o => !["paid","completed","returned","cancelled"].includes(o.status));
                if (!uf.length) return <Card><CardContent className="pt-6 text-center text-green-600">✓ All orders are closed — no unfinished orders</CardContent></Card>;
                return (<><div className="p-3 bg-warning-50 border border-warning-200 rounded-lg text-sm text-warning-700 font-semibold">⚠️ {uf.length} order(s) still open (pending/preparing/ready) — needs investigation</div>{uf.map(o => { const c = clients.find(cl => cl.id === o.customer_id); return (<Card key={o.id} className="cursor-pointer border-warning-200 bg-warning-50" onClick={() => { setSelectedOrder(o); setOrderDetailsDialog(true); }}><CardContent className="pt-4 pb-4"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-blue-600">#{o.id.slice(0,8).toUpperCase()}</p><Badge className="bg-warning-100 text-warning-700 capitalize">{o.status}</Badge>{o.payment_method ? <Badge variant="outline">{o.payment_method}</Badge> : <Badge className="bg-red-100 text-red-700">No payment</Badge>}</div><p className="text-sm text-slate-700 mt-1">{o.customer_name || "N/A"}</p><p className="text-xs text-slate-500">{c?.phone}</p><div className="flex gap-3 mt-1 text-xs text-slate-500"><span>{new Date(o.created_date).toLocaleString()}</span><span>{o.order_type}</span>{o.table_number && <span>Table: {o.table_number}</span>}</div></div><div className="text-right"><p className="text-xl font-bold text-warning-700">{formatCurrency(o.total)}</p><p className="text-xs text-slate-500">{o.items?.length} items</p></div></div></CardContent></Card>);})}</>);
              })()}
            </TabsContent>

            <TabsContent value="all" className="space-y-2 mt-4">
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-slate-500">
                    No orders yet
                  </CardContent>
                </Card>
              ) : (
                orders.map(order => {
                  const customer = clients.find(c => c.id === order.customer_id);
                  return (
                  <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedOrder(order); setOrderDetailsDialog(true); }}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                            {order.is_returned && (
                              <Badge className="bg-red-100 text-red-700 border-red-300">RETURNED</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                          <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                          <div className="flex gap-4 mt-2 text-sm text-slate-600">
                            <span>{new Date(order.created_date).toLocaleString()}</span>
                            <Badge variant="outline">{order.payment_method}</Badge>
                            <span>{order.order_type}</span>
                            {order.table_number && <span>Table: {order.table_number}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${order.is_returned ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(order.total)}</p>
                          <p className="text-sm text-slate-500">{order.items?.length} items</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="cash" className="space-y-2 mt-4">
              {orders.filter(o => o.payment_method === "cash").map(order => {
                const customer = clients.find(c => c.id === order.customer_id);
                return (
                <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedOrder(order); setOrderDetailsDialog(true); }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                          {order.is_returned && (
                            <Badge className="bg-red-100 text-red-700 border-red-300">RETURNED</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                        <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(order.created_date).toLocaleString()}</span>
                          <span>{order.order_type}</span>
                          {order.table_number && <span>Table: {order.table_number}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${order.is_returned ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(order.total)}</p>
                        <p className="text-sm text-slate-500">{order.items?.length} items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="card" className="space-y-2 mt-4">
              {orders.filter(o => ["visa", "card", "stripe"].includes(o.payment_method)).map(order => {
                const customer = clients.find(c => c.id === order.customer_id);
                return (
                <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedOrder(order); setOrderDetailsDialog(true); }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                          {order.is_returned && (
                            <Badge className="bg-red-100 text-red-700 border-red-300">RETURNED</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                        <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(order.created_date).toLocaleString()}</span>
                          <Badge variant="outline">{order.payment_method}</Badge>
                          <span>{order.order_type}</span>
                          {order.table_number && <span>Table: {order.table_number}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${order.is_returned ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(order.total)}</p>
                        <p className="text-sm text-slate-500">{order.items?.length} items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="wallet" className="space-y-2 mt-4">
              {orders.filter(o => ["wallet", "instapay", "cashback_balance"].includes(o.payment_method)).map(order => {
                const customer = clients.find(c => c.id === order.customer_id);
                return (
                <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedOrder(order); setOrderDetailsDialog(true); }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                          {order.is_returned && (
                            <Badge className="bg-red-100 text-red-700 border-red-300">RETURNED</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                        <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(order.created_date).toLocaleString()}</span>
                          <Badge variant="outline">{order.payment_method}</Badge>
                          <span>{order.order_type}</span>
                          {order.table_number && <span>Table: {order.table_number}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${order.is_returned ? 'text-red-600' : 'text-purple-600'}`}>{formatCurrency(order.total)}</p>
                        <p className="text-sm text-slate-500">{order.items?.length} items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="cl" className="space-y-2 mt-4">
              {orders.filter(o => o.payment_method === "cl").map(order => {
                const customer = clients.find(c => c.id === order.customer_id);
                return (
                <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedOrder(order); setOrderDetailsDialog(true); }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                          {order.is_returned && (
                            <Badge className="bg-red-100 text-red-700 border-red-300">RETURNED</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                        <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(order.created_date).toLocaleString()}</span>
                          <span>{order.order_type}</span>
                          {order.table_number && <span>Table: {order.table_number}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${order.is_returned ? 'text-red-600' : 'text-amber-600'}`}>{formatCurrency(order.total)}</p>
                        <p className="text-sm text-slate-500">{order.items?.length} items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="recharge" className="space-y-2 mt-4">
              {orders.filter(o => o.payment_method === "recharge_balance").map(order => {
                const customer = clients.find(c => c.id === order.customer_id);
                return (
                <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedOrder(order); setOrderDetailsDialog(true); }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                          {order.is_returned && (
                            <Badge className="bg-red-100 text-red-700 border-red-300">RETURNED</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                        <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(order.created_date).toLocaleString()}</span>
                          <span>{order.order_type}</span>
                          {order.table_number && <span>Table: {order.table_number}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${order.is_returned ? 'text-red-600' : 'text-blue-600'}`}>{formatCurrency(order.total)}</p>
                        <p className="text-sm text-slate-500">{order.items?.length} items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="hospitality" className="space-y-2 mt-4">
              {orders.filter(o => o.payment_method === "hospitality").map(order => {
                const customer = clients.find(c => c.id === order.customer_id);
                return (
                <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedOrder(order); setOrderDetailsDialog(true); }}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-blue-600">#{order.id.slice(0, 8).toUpperCase()}</p>
                          {order.is_returned && (
                            <Badge className="bg-red-100 text-red-700 border-red-300">RETURNED</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-1">{order.customer_name || "N/A"}</p>
                        <p className="text-xs text-slate-500">{customer?.phone || "N/A"}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(order.created_date).toLocaleString()}</span>
                          <span>{order.order_type}</span>
                          {order.table_number && <span>Table: {order.table_number}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${order.is_returned ? 'text-red-600' : 'text-purple-600'}`}>{formatCurrency(order.total)}</p>
                        <p className="text-sm text-slate-500">{order.items?.length} items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="solditems" className="space-y-4">
          {(() => {
            // Aggregate sold items
            const itemsMap = {};
            
            getPaidOrders(orders).filter(o => !o.is_returned).forEach(order => {
              const pricingType = order.order_type === "delivery" && 
                                  order.delivery_company_id && 
                                  !["self_delivery"].includes(order.delivery_company_id)
                                  ? "Indirect" : "Direct";
              
              const orderType = order.order_type === "dine_in" ? "Dine In" :
                               order.order_type === "takeaway" ? "Takeaway" :
                               order.order_type === "delivery" ? "Delivery" : "Other";
              
              const deliveryCompanyName = order.order_type === "delivery" && order.delivery_company_name 
                                          ? order.delivery_company_name 
                                          : "N/A";
              
              order.items?.forEach(item => {
                const key = `${pricingType}|${orderType}|${deliveryCompanyName}|${item.name}`;
                
                if (!itemsMap[key]) {
                  itemsMap[key] = {
                    pricingType,
                    orderType,
                    deliveryCompany: deliveryCompanyName,
                    itemName: item.name,
                    quantity: 0,
                    totalPrice: 0
                  };
                }
                
                itemsMap[key].quantity += item.quantity;
                itemsMap[key].totalPrice += (item.price + (item.option_price_modifier || 0)) * item.quantity;
              });
            });
            
            const itemsArray = Object.values(itemsMap);
            
            // Group by pricing type
            const directItems = itemsArray.filter(i => i.pricingType === "Direct");
            const indirectItems = itemsArray.filter(i => i.pricingType === "Indirect");
            
            const renderItemsGroup = (items, title) => {
              if (items.length === 0) return null;
              
              // Group by order type
              const dineInItems = items.filter(i => i.orderType === "Dine In");
              const takeawayItems = items.filter(i => i.orderType === "Takeaway");
              const deliveryItems = items.filter(i => i.orderType === "Delivery");
              
              // Group delivery items by company
              const deliveryByCompany = {};
              deliveryItems.forEach(item => {
                if (!deliveryByCompany[item.deliveryCompany]) {
                  deliveryByCompany[item.deliveryCompany] = [];
                }
                deliveryByCompany[item.deliveryCompany].push(item);
              });
              
              return (
                <Card key={title} className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dineInItems.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-blue-700">Dine In</h4>
                        <div className="space-y-1">
                          {dineInItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-blue-50 p-2 rounded text-sm">
                              <span className="font-medium">{item.itemName}</span>
                              <span className="text-slate-600">
                                {item.quantity} × {formatCurrency(item.totalPrice / item.quantity)} = {formatCurrency(item.totalPrice)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-1 border-t font-semibold">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(dineInItems.reduce((sum, i) => sum + i.totalPrice, 0))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {takeawayItems.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-green-700">Takeaway</h4>
                        <div className="space-y-1">
                          {takeawayItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-green-50 p-2 rounded text-sm">
                              <span className="font-medium">{item.itemName}</span>
                              <span className="text-slate-600">
                                {item.quantity} × {formatCurrency(item.totalPrice / item.quantity)} = {formatCurrency(item.totalPrice)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-1 border-t font-semibold">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(takeawayItems.reduce((sum, i) => sum + i.totalPrice, 0))}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {Object.keys(deliveryByCompany).length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-purple-700">Delivery</h4>
                        {Object.entries(deliveryByCompany).map(([company, companyItems]) => (
                          <div key={company} className="mb-3">
                            <h5 className="text-xs font-medium text-purple-600 mb-1">{company}</h5>
                            <div className="space-y-1">
                              {companyItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-purple-50 p-2 rounded text-sm">
                                  <span className="font-medium">{item.itemName}</span>
                                  <span className="text-slate-600">
                                    {item.quantity} × {formatCurrency(item.totalPrice / item.quantity)} = {formatCurrency(item.totalPrice)}
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-between pt-1 border-t text-xs font-semibold">
                                <span>Subtotal:</span>
                                <span>{formatCurrency(companyItems.reduce((sum, i) => sum + i.totalPrice, 0))}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t-2 font-semibold">
                          <span>Total Delivery:</span>
                          <span>{formatCurrency(deliveryItems.reduce((sum, i) => sum + i.totalPrice, 0))}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between pt-3 border-t-2 font-bold text-base">
                      <span>Total {title}:</span>
                      <span className="text-green-600">{formatCurrency(items.reduce((sum, i) => sum + i.totalPrice, 0))}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            };
            
            return (
              <div className="space-y-4">
                {itemsArray.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-slate-500">
                      No items sold yet
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {renderItemsGroup(directItems, "Direct Pricing")}
                    {renderItemsGroup(indirectItems, "Indirect Pricing")}
                    
                    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-green-900">Grand Total Sold:</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(itemsArray.reduce((sum, i) => sum + i.totalPrice, 0))}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({visaCredits.length})</TabsTrigger>
              <TabsTrigger value="cash">Cash ({visaCredits.filter(v => v.payment_method === "cash").length})</TabsTrigger>
              <TabsTrigger value="credit">Credit ({visaCredits.filter(v => v.payment_method === "credit").length})</TabsTrigger>
              {deliveryCompanies.map(company => (
                <TabsTrigger key={company.id} value={company.id}>
                  {company.name} ({visaCredits.filter(v => v.delivery_company_id === company.id || v.delivery_company === company.name).length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="space-y-2 mt-4">
              {visaCredits.map(credit => (
                <Card key={credit.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{credit.delivery_company}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(credit.credit_date).toLocaleString()}</span>
                          <span>Ref: {credit.order_reference}</span>
                          <Badge variant={credit.payment_method === "cash" ? "default" : "secondary"}>
                            {credit.payment_method}
                          </Badge>
                          <Badge variant={credit.status === "settled" ? "default" : "secondary"}>
                            {credit.status}
                          </Badge>
                        </div>
                      </div>
                      <p className={`text-xl font-bold ${credit.payment_method === "cash" ? "text-green-600" : "text-blue-600"}`}>
                        {formatCurrency(credit.amount)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="cash" className="space-y-2 mt-4">
              {visaCredits.filter(v => v.payment_method === "cash").map(credit => (
                <Card key={credit.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{credit.delivery_company}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(credit.credit_date).toLocaleString()}</span>
                          <span>Ref: {credit.order_reference}</span>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(credit.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="credit" className="space-y-2 mt-4">
              {visaCredits.filter(v => v.payment_method === "credit").map(credit => (
                <Card key={credit.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{credit.delivery_company}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                          <span>{new Date(credit.credit_date).toLocaleString()}</span>
                          <span>Ref: {credit.order_reference}</span>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(credit.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {deliveryCompanies.map(company => (
              <TabsContent key={company.id} value={company.id} className="space-y-2 mt-4">
                {visaCredits.filter(v => v.delivery_company_id === company.id || v.delivery_company === company.name).map(credit => (
                  <Card key={credit.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex gap-4 mt-2 text-sm text-slate-600">
                            <span>{new Date(credit.credit_date).toLocaleString()}</span>
                            <span>Ref: {credit.order_reference}</span>
                            <Badge variant={credit.payment_method === "cash" ? "default" : "secondary"}>
                              {credit.payment_method}
                            </Badge>
                          </div>
                        </div>
                        <p className={`text-xl font-bold ${credit.payment_method === "cash" ? "text-green-600" : "text-blue-600"}`}>
                          {formatCurrency(credit.amount)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessions.map(session => (
            <Card 
              key={session.id} 
              className={session.status === "closed" ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
              onClick={() => {
                if (session.status === "closed") {
                  setViewingSession(session);
                  setViewSessionDialog(true);
                }
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {new Date(session.session_date).toLocaleDateString()} - {session.cashier_name}
                  </CardTitle>
                  <Badge variant={session.status === "open" ? "default" : "secondary"}>
                    {session.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Opening Cash</p>
                  <p className="font-semibold">{formatCurrency(session.opening_cash)}</p>
                </div>
                {session.status === "closed" && (
                  <>
                    <div>
                      <p className="text-sm text-slate-600">Closing Cash</p>
                      <p className="font-semibold">{formatCurrency(session.closing_cash)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Difference</p>
                      <p className={`font-semibold ${session.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {session.cash_difference >= 0 ? '+' : ''}{formatCurrency(session.cash_difference)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Sales</p>
                      <p className="font-semibold">{formatCurrency(session.total_sales)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Expenses</p>
                      <p className="font-semibold">{formatCurrency(session.total_expenses)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Returns</p>
                      <p className="font-semibold text-red-600">{formatCurrency(session.total_returns || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Delivery Orders</p>
                      <p className="font-semibold">{session.total_delivery_orders || 0} orders</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Delivery Cash</p>
                      <p className="font-semibold text-green-600">{formatCurrency(session.total_delivery_cash || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Delivery Credit</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(session.total_delivery_credit || 0)}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {canApprovePending && (
        <TabsContent value="pending" className="space-y-4">
          <ApprovalsCenterNotice what="Pending cashier expenses and purchases" />
        </TabsContent>
        )}

        <TabsContent value="reports" className="space-y-4">
          <SessionReports />
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          {returns.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-slate-500">
                No returns recorded
              </CardContent>
            </Card>
          ) : (
            returns.map(ret => (
            <Card key={ret.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-red-600">{ret.order_reference}</p>
                    <div className="flex gap-4 mt-2 text-sm text-slate-600">
                      <span>{new Date(ret.return_date).toLocaleString()}</span>
                      <Badge variant="outline">{ret.payment_method}</Badge>
                      <span>{ret.reason}</span>
                    </div>
                    {ret.notes && <p className="text-sm text-slate-600 mt-2">{ret.notes}</p>}
                    <p className="text-xs text-slate-500 mt-1">Original: {formatCurrency(ret.original_amount)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold text-red-600">-{formatCurrency(ret.refund_amount)}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete this return and restore order ${ret.order_reference}?`)) {
                          deleteReturnMutation.mutate(ret);
                        }
                      }}
                      disabled={deleteReturnMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </TabsContent>

        <TabsContent value="deposits" className="space-y-4">
          {deposits.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-slate-500">
                No deposits recorded
              </CardContent>
            </Card>
          ) : (
            deposits.map(deposit => (
            <Card key={deposit.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{deposit.source}</p>
                    <div className="flex gap-4 mt-2 text-sm text-slate-600">
                      <span>{new Date(deposit.deposit_date).toLocaleString()}</span>
                      <Badge variant="outline">{deposit.payment_method}</Badge>
                      {deposit.reference_number && <span>Ref: {deposit.reference_number}</span>}
                    </div>
                    {deposit.notes && <p className="text-sm text-slate-600 mt-2">{deposit.notes}</p>}
                  </div>
                  <p className="text-xl font-bold text-green-600">+{formatCurrency(deposit.amount)}</p>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          {allExpenses.filter(e => e.session_id === openSession?.id).length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-slate-500">
                No expenses recorded
              </CardContent>
            </Card>
          ) : (
            allExpenses.filter(e => e.session_id === openSession?.id).map(expense => (
            <Card key={expense.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">{expense.description}</p>
                      <Badge variant={expense.status === "approved" ? "default" : expense.status === "rejected" ? "destructive" : "secondary"}>
                        {expense.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-slate-600">
                      <span>{new Date(expense.expense_date).toLocaleString()}</span>
                      <Badge variant="outline">{expense.category}</Badge>
                      <span>To: {expense.recipient}</span>
                    </div>
                    {expense.receipt_url && (
                      <a {...fileLinkProps(expense.receipt_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-2">
                        📎 View receipt
                      </a>
                    )}
                    {expense.rejection_reason && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                        Rejected: {expense.rejection_reason}
                      </p>
                    )}
                  </div>
                  <p className="text-xl font-bold text-red-600">-{formatCurrency(expense.amount)}</p>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          {allPurchases.filter(p => p.session_id === openSession?.id).length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-slate-500">
                No purchases recorded
              </CardContent>
            </Card>
          ) : (
            allPurchases.filter(p => p.session_id === openSession?.id).map(purchase => (
            <Card key={purchase.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">{purchase.supplier}</p>
                      <Badge variant={purchase.status === "approved" ? "default" : purchase.status === "rejected" ? "destructive" : "secondary"}>
                        {purchase.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-slate-600">
                      <span>{new Date(purchase.purchase_date).toLocaleString()}</span>
                      {purchase.invoice_number && <span>Invoice: {purchase.invoice_number}</span>}
                      <Badge variant="outline">{purchase.payment_method}</Badge>
                    </div>
                    {purchase.receipt_url && (
                      <a {...fileLinkProps(purchase.receipt_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-2">
                        📎 View receipt
                      </a>
                    )}
                    {purchase.rejection_reason && (
                      <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                        Rejected: {purchase.rejection_reason}
                      </p>
                    )}
                  </div>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(purchase.total_amount)}</p>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </TabsContent>

        {canViewAudit && (<TabsContent value="audit" className="space-y-4"><div><h3 className="text-lg font-semibold text-slate-900 mb-1">Cashier Audit Log</h3><p className="text-sm text-slate-500">Complete history of all changes impacting the cashier session.</p></div><CashierAuditLog sessionId={openSession?.id} /></TabsContent>)}
        {isSuperAdmin && (<TabsContent value="order-audit" className="space-y-4"><div><h3 className="text-lg font-semibold text-slate-900 mb-1">Order Modification Audit Trail</h3><p className="text-sm text-slate-500">Track all changes made to orders — payment method changes, status updates, deletions, and item modifications.</p></div><OrderAuditLogViewer sessionId={openSession?.id} /></TabsContent>)}
      </Tabs>
      )}

      <CashierDialogs
        openSessionDialog={openSessionDialog} setOpenSessionDialog={setOpenSessionDialog}
        closeSessionDialog={closeSessionDialog} setCloseSessionDialog={setCloseSessionDialog}
        reconciliationDialog={reconciliationDialog} setReconciliationDialog={setReconciliationDialog}
        openingCash={openingCash} setOpeningCash={setOpeningCash}
        closingCash={closingCash} setClosingCash={setClosingCash}
        closingCashTemp={closingCashTemp} sessionNotes={sessionNotes} setSessionNotes={setSessionNotes}
        handleOpenSession={handleOpenSession} handleInitiateClose={handleInitiateClose} handleConfirmClose={handleConfirmClose}
        createSessionMutation={createSessionMutation} updateSessionMutation={updateSessionMutation}
        expenseDialog={expenseDialog} setExpenseDialog={setExpenseDialog}
        expenseData={expenseData} setExpenseData={setExpenseData}
        uploadingExpenseReceipt={uploadingExpenseReceipt} setUploadingExpenseReceipt={setUploadingExpenseReceipt}
        handleAddExpense={handleAddExpense} createExpenseMutation={createExpenseMutation}
        orderDetailsDialog={orderDetailsDialog} setOrderDetailsDialog={setOrderDetailsDialog}
        selectedOrder={selectedOrder}
        editingPaymentMethod={editingPaymentMethod} setEditingPaymentMethod={setEditingPaymentMethod}
        newPaymentMethod={newPaymentMethod} setNewPaymentMethod={setNewPaymentMethod}
        handleUpdatePaymentMethod={handleUpdatePaymentMethod} deleteOrderMutation={deleteOrderMutation}
        clients={clients}
        returnDialog={returnDialog} setReturnDialog={setReturnDialog}
        returnData={returnData} setReturnData={setReturnData}
        handleAddReturn={handleAddReturn} createReturnMutation={createReturnMutation}
        orders={orders}
        depositDialog={depositDialog} setDepositDialog={setDepositDialog}
        depositData={depositData} setDepositData={setDepositData}
        handleAddDeposit={handleAddDeposit} createDepositMutation={createDepositMutation}
        openSession={openSession} expenses={expenses} purchases={purchases} deposits={deposits} returns={returns} visaCredits={visaCredits} deliveryCompanies={deliveryCompanies}
        viewSessionDialog={viewSessionDialog} setViewSessionDialog={setViewSessionDialog} viewingSession={viewingSession}
        purchaseDialog={purchaseDialog} setPurchaseDialog={setPurchaseDialog}
        createPurchaseMutation={createPurchaseMutation}
        getCairoNow={getCairoNow} currentUser={currentUser}
      />
    </div>
  );
}