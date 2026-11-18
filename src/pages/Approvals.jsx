import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { stockMovement, logStockMovements } from "@/lib/stockMovements";
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
import { Check, X, FileText, AlertCircle, Clock, PoundSterling, ShoppingCart, TrendingDown, Users, Gift, CreditCard, ArrowUpCircle, RotateCcw, Layers, Trash2, Package, PartyPopper } from "lucide-react";
import CateringEventApprovals from "@/components/approvals/CateringEventApprovals";
import CateringPoApprovalQueue from "@/components/catering/CateringPoApprovalQueue";
import { ExpiryQueue, SessionsQueue, CustodyQueue } from "@/components/approvals/OperationalQueues";
import AttendanceConfirmQueue from "@/components/approvals/AttendanceConfirmQueue";
import DeliveryBonusQueue from "@/components/approvals/DeliveryBonusQueue";
import DepositWithdrawalQueue from "@/components/approvals/DepositWithdrawalQueue";
import useOperationalQueues from "@/components/approvals/useOperationalQueues";
import usePendingCateringPayments from '@/components/catering/usePendingCateringPayments';
import CateringPaymentQueue from '@/components/approvals/CateringPaymentQueue';
import CateringQuoteQueue, { usePendingQuotes } from '@/components/approvals/CateringQuoteQueue';
import BookingApprovalQueue, { usePendingBookings } from '@/components/approvals/BookingApprovalQueue';
import RequisitionApprovalQueue, { usePendingRequisitions } from '@/components/approvals/requisitions/RequisitionApprovalQueue';
import {
  usePendingTreasuryApprovals,
  CustodyApprovalQueue,
  ExpenseDisbursementApprovalQueue,
} from "@/components/approvals/TreasuryApprovalQueues";
import ApprovalBands from "@/components/approvals/ApprovalBands";
import ReviewModeration from "@/components/admin/ReviewModeration";
import ApprovalSummaryBar from "@/components/approvals/ApprovalSummaryBar";
import { useBranch } from "@/components/branches/BranchContext";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import RestaurantLogo from "@/components/RestaurantLogo";
import WastePhoto from "@/components/inventory/WastePhoto";

import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";
import { APPROVAL_QUEUE_KEYS, TYPE_TO_QUEUE } from "@/components/approvals/approvalPermissions";

export default function Approvals() {
  // Tabs closed in Admin › Modules are left out.
  const screenTabs = useScreenTabs("Approvals");
  const firstTab = screenTabs.pick("pending", ["pending", "recent"]);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [viewingType, setViewingType] = useState(null);

  const queryClient = useQueryClient();

  // Real-time subscriptions to all approval-related entities
  useEffect(() => {
    const entities = [
      "Expense", "FinanceCustodyRequest", "FinanceExpenseDisbursement", "CashierPurchase", "RegistrationRequest", "Redemption",
      "Payout", "LevelUpgradeRequest", "BalanceRecharge",
      "Return", "CashbackDistributionPending", "WasteDeclaration", "PurchaseOrder", "Requisition"
    ];
    const unsubscribers = entities.map(entityName =>
      base44.entities[entityName].subscribe(() => {
        queryClient.invalidateQueries();
      })
    );
    return () => unsubscribers.forEach(unsub => unsub());
  }, [queryClient]);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  // Resolved centrally by PermissionsProvider — no duplicate permission read.
  const { permissions: userPermissions, assigned } = usePermissions();
  const { data: pendingRequisitions = [] } = usePendingRequisitions();

  const isAdmin = useIsAdmin();
  // Each queue is visible/actionable only with its own approval permission.
  // Requisition approvals follow assigned flags only — admin status grants nothing (the server checks the same).
  const can = (queueId) => queueId === 'requisitions' ? assigned?.requisition_approve === true : isAdmin || !!userPermissions?.[APPROVAL_QUEUE_KEYS[queueId]] || (queueId === 'cateringPayments' && userPermissions?.catering_finance === true);
  const canType = (type) => can(TYPE_TO_QUEUE[type]);
  const { data: pendingQuotes = [] } = usePendingQuotes();
  const { data: pendingBookings = [] } = usePendingBookings();

  // Fetch all pending approvals
  const { data: pendingReviewCount = 0 } = useQuery({
    queryKey: ["pendingReviewCount"],
    queryFn: () => base44.entities.Review.count({ status: "pending" }),
  });

  const { data: pendingExpenses = [] } = useQuery({
    queryKey: ["pendingExpenses"],
    queryFn: async () => {
      const all = await base44.entities.Expense.filter({ status: "pending" });
      return all.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    }
  });

  const { data: pendingPurchases = [] } = useQuery({
    queryKey: ["pendingPurchases"],
    queryFn: async () => {
      const all = await base44.entities.CashierPurchase.filter({ status: "pending" });
      return all.sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
    }
  });

  const { data: pendingRegistrations = [] } = useQuery({
    queryKey: ["pendingRegistrations"],
    queryFn: async () => {
      const all = await base44.entities.RegistrationRequest.filter({ status: "pending_admin" });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: pendingRedemptions = [] } = useQuery({
    queryKey: ["pendingRedemptions"],
    queryFn: async () => {
      const all = await base44.entities.Redemption.filter({ status: "pending" });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: pendingPayouts = [] } = useQuery({
    queryKey: ["pendingPayouts"],
    queryFn: async () => {
      const all = await base44.entities.Payout.filter({ status: "pending" });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: pendingLevelUpgrades = [] } = useQuery({
    queryKey: ["pendingLevelUpgrades"],
    queryFn: async () => {
      const all = await base44.entities.LevelUpgradeRequest.filter({ status: "pending" });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: pendingRecharges = [] } = useQuery({
    queryKey: ["pendingRecharges"],
    queryFn: async () => {
      const all = await base44.entities.BalanceRecharge.filter({ status: "pending" });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: pendingReturns = [] } = useQuery({
    queryKey: ["pendingReturns"],
    queryFn: async () => {
      const all = await base44.entities.Return.filter({ status: "pending" });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: pendingCashbackDistributions = [] } = useQuery({
    queryKey: ["pendingCashbackDistributions"],
    queryFn: async () => {
      const all = await base44.entities.CashbackDistributionPending.filter({ status: "pending_approval" });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: pendingWasteDeclarations = [] } = useQuery({
    queryKey: ["pendingWasteDeclarations"],
    queryFn: async () => {
      const all = await base44.entities.WasteDeclaration.filter({ status: "pending" });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { data: pendingPurchaseOrders = [] } = useQuery({
    queryKey: ["pendingPurchaseOrders"],
    queryFn: async () => {
      const all = await base44.entities.PurchaseOrder.filter({ status: "pending_approval" });
      // Catering shortfall POs get their own section below — it also re-syncs the
      // event's procurement rollup, which the generic card cannot do.
      return all
        .filter((po) => po.order_source !== "catering")
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  const { selectedBranchId } = useBranch();

  const { data: pendingCateringEvents = [] } = useQuery({
    queryKey: ["catering-events-pending-approval", selectedBranchId],
    queryFn: () =>
      base44.entities.CateringEvent.filter(
        { branch_id: selectedBranchId, reservation_status: "pending_approval" },
        "event_date",
        100
      ),
    enabled: !!selectedBranchId
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: () => base44.entities.InventoryItem.list("name")
  });

  // Recent approvals (last 7 days)
  const { data: recentExpensesAll = [] } = useQuery({
    queryKey: ["recentExpenses"],
    queryFn: async () => {
      const all = await base44.entities.Expense.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(e => 
        ["approved", "rejected"].includes(e.status) && 
        new Date(e.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentPurchasesAll = [] } = useQuery({
    queryKey: ["recentPurchases"],
    queryFn: async () => {
      const all = await base44.entities.CashierPurchase.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(p => 
        ["approved", "rejected"].includes(p.status) && 
        new Date(p.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentRegistrationsAll = [] } = useQuery({
    queryKey: ["recentRegistrations"],
    queryFn: async () => {
      const all = await base44.entities.RegistrationRequest.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(r => 
        ["approved", "rejected_admin"].includes(r.status) && 
        new Date(r.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentRedemptionsAll = [] } = useQuery({
    queryKey: ["recentRedemptions"],
    queryFn: async () => {
      const all = await base44.entities.Redemption.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(r => 
        ["approved", "rejected"].includes(r.status) && 
        new Date(r.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentPayoutsAll = [] } = useQuery({
    queryKey: ["recentPayouts"],
    queryFn: async () => {
      const all = await base44.entities.Payout.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(p => 
        ["completed", "rejected"].includes(p.status) && 
        new Date(p.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentLevelUpgradesAll = [] } = useQuery({
    queryKey: ["recentLevelUpgrades"],
    queryFn: async () => {
      const all = await base44.entities.LevelUpgradeRequest.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(l => 
        ["approved", "rejected"].includes(l.status) && 
        new Date(l.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentRechargesAll = [] } = useQuery({
    queryKey: ["recentRecharges"],
    queryFn: async () => {
      const all = await base44.entities.BalanceRecharge.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(r => 
        ["approved", "rejected"].includes(r.status) && 
        new Date(r.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentReturnsAll = [] } = useQuery({
    queryKey: ["recentReturns"],
    queryFn: async () => {
      const all = await base44.entities.Return.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(r => 
        ["approved", "completed", "cancelled"].includes(r.status) && 
        new Date(r.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentCashbackDistributionsAll = [] } = useQuery({
    queryKey: ["recentCashbackDistributions"],
    queryFn: async () => {
      const all = await base44.entities.CashbackDistributionPending.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(r => 
        ["approved", "executed", "rejected"].includes(r.status) && 
        new Date(r.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentPurchaseOrdersAll = [] } = useQuery({
    queryKey: ["recentPurchaseOrders"],
    queryFn: async () => {
      const all = await base44.entities.PurchaseOrder.list("-updated_date");
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return all.filter(p => 
        ["pending", "confirmed", "delivered", "cancelled"].includes(p.status) && 
        new Date(p.updated_date) >= sevenDaysAgo
      );
    }
  });

  const { data: recentWasteAll = [] } = useQuery({
    queryKey: ["recentWasteDeclarations"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const page = await base44.entities.WasteDeclaration.filter(
        { status: { $in: ["approved", "rejected"] }, updated_date: { $gte: sevenDaysAgo } },
        { sort: "-updated_date", limit: 50 }
      );
      return page.items;
    }
  });

  const ops = useOperationalQueues();
  const paymentQueue = usePendingCateringPayments();
  const treasuryQueue = usePendingTreasuryApprovals(can("custodyRequests") || can("expenseDisbursements"));
  const pendingCustodyReqs = treasuryQueue.data?.custody_requests || [];
  const pendingExpenseDisbs = treasuryQueue.data?.expense_disbursements || [];

  // Each queue: which band it belongs to, its count, and how to render it.
  // `external` = the action happens on another screen.
  const cardSection = (id, band, title, Icon, iconClass, items, type, label) => ({
    id, band, title, count: items.length,
    render: () => (
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconClass}`} /> {title} ({items.length})
        </h2>
        <div className="space-y-3">{items.map((item) => renderApprovalCard(item, type, Icon, label))}</div>
      </div>
    ),
  });

  const sections = [
    {
      id: "custodyRequests",
      band: "money",
      title: "Petty Cash & Custody",
      count: pendingCustodyReqs.length,
      render: () => (
        <CustodyApprovalQueue
          items={pendingCustodyReqs}
          currentUserEmail={currentUser?.email}
          selfBypass={Boolean(userPermissions?.approval_self_bypass)}
        />
      ),
    },
    {
      id: "expenseDisbursements",
      band: "money",
      title: "Expense & Vendor Disbursements",
      count: pendingExpenseDisbs.length,
      render: () => (
        <ExpenseDisbursementApprovalQueue
          items={pendingExpenseDisbs}
          currentUserEmail={currentUser?.email}
          selfBypass={Boolean(userPermissions?.approval_self_bypass)}
        />
      ),
    },
    cardSection("expenses", "money", "Cashier Expenses", TrendingDown, "text-red-500", pendingExpenses, "expense", "EXPENSE"),
    cardSection("purchases", "money", "Cashier Purchases", ShoppingCart, "text-amber-500", pendingPurchases, "purchase", "PURCHASE"),
    cardSection("payouts", "money", "Payout Requests", PoundSterling, "text-green-500", pendingPayouts, "payout", "PAYOUT"),
    cardSection("recharges", "money", "Balance Recharges", CreditCard, "text-teal-500", pendingRecharges, "recharge", "RECHARGE"),
    cardSection("registrations", "clients", "Client Registrations", Users, "text-blue-500", pendingRegistrations, "registration", "REGISTRATION"),
    { id: "withdrawals", band: "money", title: "Deposit Withdrawals", count: ops.withdrawals.length, render: () => <DepositWithdrawalQueue /> },
    { id: 'cateringPayments', band: 'money', title: 'Catering Payments', count: paymentQueue.total, render: () => <CateringPaymentQueue query={paymentQueue} /> },
    cardSection("upgrades", "clients", "Level Upgrades", ArrowUpCircle, "text-cyan-500", pendingLevelUpgrades, "levelUpgrade", "LEVEL UPGRADE"),
    cardSection("redemptions", "clients", "Reward Redemptions", Gift, "text-purple-500", pendingRedemptions, "redemption", "REDEMPTION"),
    cardSection("returns", "clients", "Order Returns", RotateCcw, "text-orange-500", pendingReturns, "return", "RETURN"),
    cardSection("cashback", "clients", "Cashback Distributions", Layers, "text-violet-500", pendingCashbackDistributions, "cashbackDistribution", "CASHBACK DIST."),
    cardSection("pos", "stock", "Purchase Orders", Package, "text-orange-600", pendingPurchaseOrders, "purchaseOrder", "PURCHASE ORDER"),
    { id: "cateringPos", band: "stock", title: "Catering POs", count: ops.cateringPos.length, render: () => <CateringPoApprovalQueue /> },
    cardSection("waste", "stock", "Waste Declarations", Trash2, "text-red-500", pendingWasteDeclarations, "waste", "WASTE"),
    { id: "expiry", band: "stock", title: "Expiry Reports", count: ops.expiry.length, external: true, render: () => <ExpiryQueue items={ops.expiry} /> },
    {
      id: "events", band: "catering", title: "Event Reservations", count: pendingCateringEvents.length,
      render: () => (
        <div>
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-amber-500" /> Catering Event Reservations ({pendingCateringEvents.length})
          </h2>
          <CateringEventApprovals events={pendingCateringEvents} />
        </div>
      ),
    },
    { id: "bookings", band: "catering", title: "Booking Approvals", count: pendingBookings.length, render: () => <BookingApprovalQueue /> },
    { id: "cateringQuotes", band: "catering", title: "Quote Revisions", count: pendingQuotes.length, render: () => <CateringQuoteQueue /> },
    { id: "custody", band: "catering", title: "Custody Shortages", count: ops.shortages.length, external: true, render: () => <CustodyQueue items={ops.shortages} /> },
    { id: "requisitions", band: "catering", title: "Over-Limit Requisitions", count: pendingRequisitions.length, render: () => <RequisitionApprovalQueue /> },
    { id: "attendance", band: "people", title: "Attendance", count: ops.attendance.length, render: () => <AttendanceConfirmQueue canApprove /> },
    { id: "bonuses", band: "people", title: "Delivery Bonuses", count: ops.bonuses.length, render: () => <DeliveryBonusQueue canApprove /> },
    { id: "sessions", band: "people", title: "Cashier Sessions", count: ops.sessions.length, external: true, render: () => <SessionsQueue items={ops.sessions} /> },
    { id: "reviews", band: "clients", title: "Customer Reviews", count: pendingReviewCount, render: () => <ReviewModeration /> },
  ].filter((s) => can(s.id));

  // Recent history follows the same per-queue permission.
  const mine = (type, list) => (canType(type) ? list : []);
  const recentExpenses = mine("expense", recentExpensesAll);
  const recentPurchases = mine("purchase", recentPurchasesAll);
  const recentRegistrations = mine("registration", recentRegistrationsAll);
  const recentRedemptions = mine("redemption", recentRedemptionsAll);
  const recentPayouts = mine("payout", recentPayoutsAll);
  const recentLevelUpgrades = mine("levelUpgrade", recentLevelUpgradesAll);
  const recentRecharges = mine("recharge", recentRechargesAll);
  const recentReturns = mine("return", recentReturnsAll);
  const recentCashbackDistributions = mine("cashbackDistribution", recentCashbackDistributionsAll);
  const recentPurchaseOrders = mine("purchaseOrder", recentPurchaseOrdersAll);
  const recentWaste = mine("waste", recentWasteAll);

  const totalPending = sections.reduce((n, s) => n + s.count, 0);

  // Mutations
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingExpenses"] });
      queryClient.invalidateQueries({ queryKey: ["recentExpenses"] });
    }
  });

  const updatePurchaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CashierPurchase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["recentPurchases"] });
    }
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RegistrationRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingRegistrations"] });
      queryClient.invalidateQueries({ queryKey: ["recentRegistrations"] });
    }
  });

  const updateRedemptionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Redemption.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingRedemptions"] });
      queryClient.invalidateQueries({ queryKey: ["recentRedemptions"] });
    }
  });

  const updatePayoutMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payout.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPayouts"] });
      queryClient.invalidateQueries({ queryKey: ["recentPayouts"] });
    }
  });

  const updateLevelUpgradeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LevelUpgradeRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingLevelUpgrades"] });
      queryClient.invalidateQueries({ queryKey: ["recentLevelUpgrades"] });
    }
  });

  const updateRechargeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BalanceRecharge.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingRecharges"] });
      queryClient.invalidateQueries({ queryKey: ["recentRecharges"] });
    }
  });

  const updateReturnMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Return.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingReturns"] });
      queryClient.invalidateQueries({ queryKey: ["recentReturns"] });
    }
  });

  const updateCashbackDistributionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CashbackDistributionPending.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingCashbackDistributions"] });
      queryClient.invalidateQueries({ queryKey: ["recentCashbackDistributions"] });
    }
  });

  const updateWasteDeclarationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WasteDeclaration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingWasteDeclarations"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["wasteDeclarations"] });
    }
  });

  const updatePurchaseOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingPurchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["recentPurchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    }
  });

  const updateInventoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data)
  });

  const handleApprove = async (item, type) => {
    const approvalData = {
      status: "approved",
      approved_by: currentUser?.full_name || currentUser?.email
    };

    try {
      switch(type) {
        case "expense":
          await updateExpenseMutation.mutateAsync({ id: item.id, data: approvalData });
          toast.success("Expense approved");
          break;
        case "purchase":
          await updatePurchaseMutation.mutateAsync({ id: item.id, data: approvalData });
          toast.success("Purchase approved");
          break;
        case "registration":
          await updateRegistrationMutation.mutateAsync({ id: item.id, data: { status: "approved", admin_approved: true } });
          toast.success("Registration approved");
          break;
        case "redemption":
          await updateRedemptionMutation.mutateAsync({ id: item.id, data: approvalData });
          toast.success("Redemption approved");
          break;
        case "payout":
          await updatePayoutMutation.mutateAsync({ id: item.id, data: { status: "completed", processed_by: currentUser?.full_name || currentUser?.email } });
          toast.success("Payout approved");
          break;
        case "levelUpgrade":
          await updateLevelUpgradeMutation.mutateAsync({ id: item.id, data: approvalData });
          toast.success("Level upgrade approved");
          break;
        case "recharge":
          await updateRechargeMutation.mutateAsync({ id: item.id, data: approvalData });
          toast.success("Recharge approved");
          break;
        case "return":
          await updateReturnMutation.mutateAsync({ id: item.id, data: { status: "approved" } });
          toast.success("Return approved");
          break;
        case "cashbackDistribution":
          await updateCashbackDistributionMutation.mutateAsync({ id: item.id, data: { status: "approved", approved_by: currentUser?.full_name || currentUser?.email } });
          toast.success("Cashback distribution approved");
          break;
        case "waste": {
          await updateWasteDeclarationMutation.mutateAsync({ id: item.id, data: { status: "approved", approved_by: currentUser?.full_name || currentUser?.email } });
          // Deduct from inventory
          const invItem = inventoryItems.find(i => i.id === item.inventory_item_id);
          if (invItem) {
            const after = (invItem.quantity || 0) - item.quantity_wasted;
            await updateInventoryMutation.mutateAsync({ id: invItem.id, data: { quantity: after } });
            await logStockMovements([stockMovement(invItem, {
              key: `waste:${item.id}`, direction: "out", type: "waste", quantity: item.quantity_wasted, unit: item.unit,
              before: invItem.quantity || 0, after, ...(Number(item.cost_impact) > 0 ? { cost_impact: Number(item.cost_impact) } : {}),
              source_entity: "WasteDeclaration", source_id: item.id, source_label: `Waste · ${String(item.reason || "other").replace(/_/g, " ")}`,
              event_id: item.event_id, actor_email: currentUser?.email, notes: item.notes,
            })]);
          }
          const posting = await base44.functions.invoke("postWasteJournal", { waste_id: item.id }).then(r => r.data).catch(e => ({ blocked: true, message: e?.response?.data?.error || e.message }));
          if (posting?.blocked) toast.warning(`Waste approved, but the journal was not posted: ${posting.message}. See Finance › Posting issues.`);
          else toast.success(posting?.posted ? "Waste approved — stock deducted and journal posted" : "Waste declaration approved — stock deducted");
          break;
        }
        case "purchaseOrder":
          await updatePurchaseOrderMutation.mutateAsync({ id: item.id, data: { status: "pending", reviewed_by: currentUser?.full_name || currentUser?.email, reviewed_at: new Date().toISOString() } });
          toast.success("Purchase order approved");
          break;
      }
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleRejectClick = (item, type) => {
    setSelectedItem(item);
    setItemType(type);
    setRejectionDialog(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    const rejectionData = {
      status: "rejected",
      rejection_reason: rejectionReason,
      approved_by: currentUser?.full_name || currentUser?.email
    };

    try {
      switch(itemType) {
        case "expense":
          await updateExpenseMutation.mutateAsync({ id: selectedItem.id, data: rejectionData });
          toast.success("Expense rejected - Investigation case opened");
          break;
        case "purchase":
          await updatePurchaseMutation.mutateAsync({ id: selectedItem.id, data: rejectionData });
          toast.success("Purchase rejected - Investigation case opened");
          break;
        case "registration":
          await updateRegistrationMutation.mutateAsync({ id: selectedItem.id, data: { status: "rejected_admin", rejection_reason: rejectionReason } });
          toast.success("Registration rejected");
          break;
        case "redemption":
          await updateRedemptionMutation.mutateAsync({ id: selectedItem.id, data: rejectionData });
          toast.success("Redemption rejected");
          break;
        case "payout":
          await updatePayoutMutation.mutateAsync({ id: selectedItem.id, data: { status: "rejected", rejection_reason: rejectionReason, processed_by: currentUser?.full_name || currentUser?.email } });
          toast.success("Payout rejected");
          break;
        case "levelUpgrade":
          await updateLevelUpgradeMutation.mutateAsync({ id: selectedItem.id, data: rejectionData });
          toast.success("Level upgrade rejected");
          break;
        case "recharge":
          await updateRechargeMutation.mutateAsync({ id: selectedItem.id, data: rejectionData });
          toast.success("Recharge rejected");
          break;
        case "return":
          await updateReturnMutation.mutateAsync({ id: selectedItem.id, data: { status: "cancelled", notes: rejectionReason } });
          toast.success("Return cancelled");
          break;
        case "cashbackDistribution":
          await updateCashbackDistributionMutation.mutateAsync({ id: selectedItem.id, data: { status: "rejected", rejection_reason: rejectionReason } });
          toast.success("Cashback distribution rejected");
          break;
        case "waste":
          await updateWasteDeclarationMutation.mutateAsync({ id: selectedItem.id, data: { status: "rejected", rejection_reason: rejectionReason, approved_by: currentUser?.full_name || currentUser?.email } });
          toast.success("Waste declaration rejected");
          break;
        case "purchaseOrder":
          await updatePurchaseOrderMutation.mutateAsync({ id: selectedItem.id, data: { status: "cancelled", cancellation_reason: rejectionReason, reviewed_by: currentUser?.full_name || currentUser?.email, reviewed_at: new Date().toISOString() } });
          toast.success("Purchase order rejected and cancelled");
          break;
      }
      setRejectionDialog(false);
      setRejectionReason("");
      setSelectedItem(null);
      setItemType(null);
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const renderApprovalCard = (item, type, icon, title, isPending = true) => {
    const Icon = icon;
    const canApprove = canType(type);
    return (
      <Card key={`${type}-${item.id}`} className={isPending ? "border-warning-300 bg-warning-50/50" : ""}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-5 h-5 text-slate-600" />
                  <Badge className={isPending ? "bg-warning-500" : item.status === "approved" || item.status === "completed" ? "bg-green-600" : "bg-red-600"}>
                    {title}
                  </Badge>
                  <Badge variant={isPending ? "secondary" : "outline"}>
                    {item.status === "completed" ? "approved" : item.status}
                  </Badge>
                </div>
                <p className="font-semibold text-lg">
                  {type === "expense" ? item.description :
                   type === "purchase" ? item.supplier :
                   type === "registration" ? item.full_name || item.client_name :
                   type === "redemption" ? `${item.client_name} - ${item.reward_name}` :
                   type === "payout" ? `${item.client_name} - Payout` :
                   type === "levelUpgrade" ? `${item.client_name} - Upgrade to ${item.requested_level_name}` :
                   type === "recharge" ? `${item.client_name} - Balance Recharge` :
                   type === "return" ? `Order #${item.order_reference || item.order_id?.slice(-6)} - Return` :
                   type === "cashbackDistribution" ? `${item.customer_name} - Cashback Distribution` :
                   type === "waste" ? `${item.inventory_item_name} — ${item.quantity_wasted} ${item.unit} wasted` :
                    type === "purchaseOrder" ? `${item.order_number} - ${item.supplier}` :
                    "Unknown"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2 text-sm text-slate-600">
                  <span>{new Date(item.created_date).toLocaleString()}</span>
                  {item.submitted_by && <span>By: {item.submitted_by}</span>}
                </div>
                {item.approved_by && (
                  <p className="text-xs text-slate-500 mt-1">
                    {item.status === "approved" || item.status === "completed" ? "Approved" : "Rejected"} by: {item.approved_by || item.processed_by}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">
                  {type === "expense" || type === "purchase" || type === "return" ? "-" : ""}
                  {formatCurrency(
                    item.amount || item.total_amount || item.registration_fee ||
                    item.payout_amount || item.refund_amount || item.amount_paid ||
                    item.cashback_amount || item.cost_impact || 0
                  )}
                </p>
              </div>
            </div>

            {item.waste_image_url && (
              <div className="border-t pt-3">
                <p className="text-xs text-slate-500 mb-2 font-medium">Waste Photo</p>
                <WastePhoto uri={item.waste_image_url} className="w-full max-h-48 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
              </div>
            )}

            {item.receipt_url && (
              <div className="border-t pt-3">
                <a 
                  {...fileLinkProps(item.receipt_url)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View Receipt/Document
                </a>
              </div>
            )}

            {item.payment_receipt_url && (
              <div className="border-t pt-3">
                <a 
                  {...fileLinkProps(item.payment_receipt_url)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View Payment Receipt
                </a>
              </div>
            )}

            {item.payment_scan_url && (
              <div className="border-t pt-3">
                <a href={item.payment_scan_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <FileText className="w-4 h-4" />
                  View Payment Document
                </a>
              </div>
            )}

            {item.national_id_url && (
              <div className="border-t pt-3">
                <a 
                  href={item.national_id_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View National ID
                </a>
              </div>
            )}

            {item.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">Rejection Reason:</span> {item.rejection_reason}
                </p>
              </div>
            )}

            {isPending && (
              <div className="border-t pt-3 flex gap-2">
                {canApprove && (
                  <>
                    <Button
                      onClick={() => handleApprove(item, type)}
                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      disabled={updateExpenseMutation.isPending || updatePurchaseMutation.isPending}
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleRejectClick(item, type)}
                      variant="destructive"
                      className="flex-1 gap-2"
                      disabled={updateExpenseMutation.isPending || updatePurchaseMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => {
                    setViewingItem(item);
                    setViewingType(type);
                    setDetailsDialog(true);
                  }}
                  variant="outline"
                  size="sm"
                  className={canApprove ? "" : "flex-1"}
                >
                  Details
                </Button>
                {!canApprove && (
                  <span className="flex items-center text-xs text-slate-500 ml-auto">
                    View only — an admin or manager is required to approve or reject.
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <RestaurantLogo className="h-10 mb-2" />
            <h1 className="text-3xl font-bold">Approvals Center</h1>
            <p className="text-slate-600 mt-1">Review and manage all pending approvals</p>
          </div>
          {totalPending > 0 && (
            <Badge className="bg-red-500 text-white text-lg px-4 py-2">
              {totalPending} Pending
            </Badge>
          )}
        </div>

        {!firstTab ? <ClosedTabsNotice /> : (
        <Tabs defaultValue={firstTab} className="space-y-6">
          <TabsList>
            {screenTabs.isOpen("pending") && (
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({totalPending})
            </TabsTrigger>
            )}
            {screenTabs.isOpen("recent") && (
            <TabsTrigger value="recent" className="gap-2">
              <Check className="w-4 h-4" />
              Recent (7 days)
            </TabsTrigger>
            )}
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending" className="space-y-6">
            <CateringPaymentQueue query={paymentQueue} statusOnly />
            {totalPending === 0 && (!paymentQueue.enabled || (!paymentQueue.isPending && !paymentQueue.error)) ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <p className="text-xl text-slate-600">All caught up!</p>
                  <p className="text-sm text-slate-500 mt-2">No pending approvals at the moment</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <ApprovalSummaryBar sections={sections} />
                <ApprovalBands sections={sections} />
              </>
            )}
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value="recent" className="space-y-6">
            {[...recentExpenses, ...recentPurchases, ...recentRegistrations, 
              ...recentRedemptions, ...recentPayouts,
              ...recentLevelUpgrades, ...recentRecharges, ...recentPurchaseOrders, ...recentWaste].length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <AlertCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-xl text-slate-600">No recent approvals</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {recentExpenses.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Expenses</h2>
                    <div className="space-y-3">
                      {recentExpenses.map(expense => renderApprovalCard(expense, "expense", TrendingDown, "EXPENSE", false))}
                    </div>
                  </div>
                )}

                {recentPurchases.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Cashier Purchases</h2>
                    <div className="space-y-3">
                      {recentPurchases.map(purchase => renderApprovalCard(purchase, "purchase", ShoppingCart, "PURCHASE", false))}
                    </div>
                  </div>
                )}

                {recentRegistrations.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Client Registrations</h2>
                    <div className="space-y-3">
                      {recentRegistrations.map(reg => renderApprovalCard(reg, "registration", Users, "REGISTRATION", false))}
                    </div>
                  </div>
                )}

                {recentRedemptions.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Reward Redemptions</h2>
                    <div className="space-y-3">
                      {recentRedemptions.map(redemption => renderApprovalCard(redemption, "redemption", Gift, "REDEMPTION", false))}
                    </div>
                  </div>
                )}

                {recentPayouts.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Payouts</h2>
                    <div className="space-y-3">
                      {recentPayouts.map(payout => renderApprovalCard(payout, "payout", PoundSterling, "PAYOUT", false))}
                    </div>
                  </div>
                )}

                {recentLevelUpgrades.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Level Upgrades</h2>
                    <div className="space-y-3">
                      {recentLevelUpgrades.map(upgrade => renderApprovalCard(upgrade, "levelUpgrade", ArrowUpCircle, "LEVEL UPGRADE", false))}
                    </div>
                  </div>
                )}

                {recentRecharges.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Balance Recharges</h2>
                    <div className="space-y-3">
                      {recentRecharges.map(recharge => renderApprovalCard(recharge, "recharge", CreditCard, "RECHARGE", false))}
                    </div>
                  </div>
                )}

                {recentReturns.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Order Returns</h2>
                    <div className="space-y-3">
                      {recentReturns.map(ret => renderApprovalCard(ret, "return", RotateCcw, "RETURN", false))}
                    </div>
                  </div>
                )}

                {recentCashbackDistributions.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Cashback Distributions</h2>
                    <div className="space-y-3">
                      {recentCashbackDistributions.map(dist => renderApprovalCard(dist, "cashbackDistribution", Layers, "CASHBACK DIST.", false))}
                    </div>
                  </div>
                )}

                {recentWaste.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Waste Declarations</h2>
                    <div className="space-y-3">
                      {recentWaste.map(waste => renderApprovalCard(waste, "waste", Trash2, "WASTE", false))}
                    </div>
                  </div>
                )}

                {recentPurchaseOrders.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Purchase Orders</h2>
                    <div className="space-y-3">
                      {recentPurchaseOrders.map(po => renderApprovalCard(po, "purchaseOrder", Package, "PURCHASE ORDER", false))}
                    </div>
                  </div>
                )}
                </>
                )}
                </TabsContent>
                </Tabs>
                )}

        {/* Rejection Dialog */}
        <Dialog open={rejectionDialog} onOpenChange={setRejectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">⚠️ Investigation Case:</span> Rejecting this request will open an investigation case for review.
                </p>
              </div>
              <div>
                <Label>Rejection Reason* <span className="text-red-500">(Required)</span></Label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this is being rejected..."
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRejectionDialog(false);
                    setRejectionReason("");
                    setSelectedItem(null);
                    setItemType(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleReject}
                  variant="destructive"
                  className="flex-1"
                  disabled={updateExpenseMutation.isPending}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
         <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
           <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
             <DialogHeader>
               <DialogTitle>Request Details</DialogTitle>
             </DialogHeader>
             {viewingItem && viewingType === "purchaseOrder" ? (
               <div className="space-y-6">
                 {/* Order Header */}
                 <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
                   <div>
                     <p className="text-slate-500 text-xs font-medium mb-1">Order Number</p>
                     <p className="font-semibold text-base">{viewingItem.order_number}</p>
                   </div>
                   <div>
                     <p className="text-slate-500 text-xs font-medium mb-1">Total Amount</p>
                     <p className="font-semibold text-base">{formatCurrency(viewingItem.total_amount)}</p>
                   </div>
                   <div>
                     <p className="text-slate-500 text-xs font-medium mb-1">Order Date</p>
                     <p className="font-medium">{new Date(viewingItem.order_date).toLocaleDateString()}</p>
                   </div>
                   <div>
                     <p className="text-slate-500 text-xs font-medium mb-1">Expected Delivery</p>
                     <p className="font-medium">{new Date(viewingItem.expected_delivery_date).toLocaleDateString()}</p>
                   </div>
                 </div>

                 {/* Supplier Info */}
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                   <h3 className="font-semibold text-blue-900 mb-3">Supplier Information</h3>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                       <p className="text-blue-700 text-xs font-medium mb-1">Supplier Name</p>
                       <p className="font-medium text-slate-900">{viewingItem.supplier}</p>
                     </div>
                     <div>
                       <p className="text-blue-700 text-xs font-medium mb-1">Contact</p>
                       <p className="font-medium text-slate-900">{viewingItem.supplier_contact || "N/A"}</p>
                     </div>
                   </div>
                 </div>

                 {/* Items Table */}
                 <div>
                   <h3 className="font-semibold mb-3">Order Items</h3>
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm border-collapse">
                       <thead>
                         <tr className="bg-slate-100 border-b">
                           <th className="text-left px-3 py-2 font-semibold">Item Name</th>
                           <th className="text-right px-3 py-2 font-semibold">Quantity</th>
                           <th className="text-right px-3 py-2 font-semibold">Unit Price</th>
                           <th className="text-right px-3 py-2 font-semibold">Total Price</th>
                           <th className="text-center px-3 py-2 font-semibold">Status</th>
                         </tr>
                       </thead>
                       <tbody>
                         {viewingItem.items?.map((item, idx) => (
                           <tr key={idx} className="border-b hover:bg-slate-50">
                             <td className="px-3 py-3">
                               <div className="font-medium text-slate-900">{item.inventory_item_name}</div>
                               <div className="text-xs text-slate-500 mt-1">Current Stock: {item.current_stock || 0} {item.selling_unit_label || item.unit}</div>
                             </td>
                             <td className="text-right px-3 py-3 font-medium">
                               {item.quantity_ordered} {item.purchase_unit_label || item.unit}
                             </td>
                             <td className="text-right px-3 py-3 font-medium">
                               {formatCurrency(item.unit_price, false)}
                             </td>
                             <td className="text-right px-3 py-3 font-semibold">
                               {formatCurrency(item.total_price, false)}
                             </td>
                             <td className="text-center px-3 py-3">
                               <Badge className={
                                 item.approval_status === "approved" ? "bg-green-600" :
                                 item.approval_status === "rejected" ? "bg-red-600" :
                                 "bg-amber-500"
                               }>
                                 {item.approval_status}
                               </Badge>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>

                 {/* Notes */}
                 {viewingItem.notes && (
                   <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                     <p className="text-sm text-slate-600 font-medium mb-1">Notes</p>
                     <p className="text-slate-700">{viewingItem.notes}</p>
                   </div>
                 )}
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   {Object.entries(viewingItem || {}).map(([key, value]) => {
                     if (key === "id" || key === "created_by" || key === "updated_date" || typeof value === "object") return null;
                     return (
                       <div key={key} className="border-b pb-2">
                         <p className="text-slate-500 text-xs capitalize">{key.replace(/_/g, ' ')}</p>
                         <p className="font-medium break-words">
                           {value?.toString() || "N/A"}
                         </p>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
           </DialogContent>
         </Dialog>
      </div>
    </div>
  );
}