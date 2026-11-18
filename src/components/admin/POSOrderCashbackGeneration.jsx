import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Zap, AlertCircle, CheckCircle2, Ban, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function POSOrderCashbackGeneration() {
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [excludeDialog, setExcludeDialog] = useState({ open: false, order: null, bulk: false });
  const [exclusionReason, setExclusionReason] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);
  const [excludeMode, setExcludeMode] = useState(false);
  const [ordersToExclude, setOrdersToExclude] = useState(new Set());

  // Fetch all orders
  const { data: allOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["posOrders"],
    queryFn: () => base44.entities.Order.list("-created_date"),
    staleTime: 30000
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["allClients"],
    queryFn: () => base44.entities.Client.list(),
    staleTime: 30000
  });

  const { data: existingDistributions = [] } = useQuery({
    queryKey: ["existingCashbackDistributions"],
    queryFn: async () => {
      const pending = await base44.entities.CashbackDistributionPending.list();
      const history = await base44.entities.CashbackRuleHistory.list();
      return [...pending, ...history];
    },
    staleTime: 30000
  });

  const { data: approvedPurchases = [] } = useQuery({
    queryKey: ["approvedPurchaseSubmissions"],
    queryFn: () => base44.entities.PurchaseSubmission.filter({ status: "approved" }),
    staleTime: 30000
  });

  const { data: cashbackRules = [] } = useQuery({
    queryKey: ["cashbackRules"],
    queryFn: () => base44.entities.CashbackRule.list(),
    staleTime: 60000
  });

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list(),
    staleTime: 60000
  });

  const { data: cashbackTiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list(),
    staleTime: 60000
  });

  const { data: payoutSettings } = useQuery({
    queryKey: ["payoutSettings"],
    queryFn: async () => {
      const settings = await base44.entities.SystemSettings.filter({ setting_key: "payout_settings" });
      return settings[0] || null;
    },
    staleTime: 60000
  });

  const payoutPercent = payoutSettings?.payout_percent || 0;

  // Calculate cashback breakdown for an order
  const calculateCashbackBreakdown = (order) => {
    const customer = clients.find(c => c.id === order.customer_id);
    if (!customer) {
      return { selfRate: 0, selfCashback: 0, payout: 0, level1Rate: 0, level1: 0, level2Rate: 0, level2: 0, level3Rate: 0, level3: 0, total: 0 };
    }

    // Self cashback rate: prefer CashbackRule if exists, then fall back to CashbackTier, then RegistrationLevel
    const rule = cashbackRules.find(r =>
      r.is_active &&
      (!r.order_type || r.order_type === "all" || r.order_type === order.order_type)
    );

    const customerTier = cashbackTiers.find(t =>
      t.id === customer.current_tier_id || t.level_name === customer.current_tier_name
    );

    const registrationLevel = registrationLevels.find(l =>
      l.id === customer.registration_level_id || l.level_name === customer.registration_level_name
    );

    // Self cashback: rule → tier → registration level
    const selfRate =
      rule?.self_cashback_percentage ||
      customerTier?.self_cashback_percentage ||
      registrationLevel?.self_cashback_percentage ||
      0;

    // Payout percent: rule's payout_percentage → system payout_percent
    const effectivePayoutPercent =
      (rule?.payout_percentage != null && rule.payout_percentage > 0)
        ? rule.payout_percentage
        : payoutPercent;

    const selfCashback = (order.total * selfRate) / 100;
    const payout = (selfCashback * effectivePayoutPercent) / 100;

    const level1Rate = customerTier?.cashback_percentage_level1 || 0;
    const level2Rate = customerTier?.cashback_percentage_level2 || 0;
    const level3Rate = customerTier?.cashback_percentage_level3 || 0;

    const level1 = (order.total * level1Rate) / 100;
    const level2 = (order.total * level2Rate) / 100;
    const level3 = (order.total * level3Rate) / 100;

    return {
      selfRate, selfCashback, payout, effectivePayoutPercent,
      level1Rate, level1,
      level2Rate, level2,
      level3Rate, level3,
      total: selfCashback + level1 + level2 + level3
    };
  };

  // Build a lookup: orderId → matching approved purchase submission
  // Matches by client + (purchase amount ≈ order total OR subtotal) within 1 EGP tolerance
  // AND the purchase submission was created within 3 days of the order (to avoid false positives for repeat customers)
  const purchaseSubmissionMatchMap = useMemo(() => {
    // Only flag as duplicate if:
    // 1. Same client
    // 2. Amount matches within 0.05 EGP (very tight - same exact receipt)
    // 3. Purchase submission was created within 24 hours of the order
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const map = new Map();
    allOrders.forEach(order => {
      const orderDate = new Date(order.created_date).getTime();
      const match = approvedPurchases.find(purchase => {
        if (purchase.client_id !== order.customer_id) return false;
        const amt = purchase.amount;
        // Very tight tolerance — same receipt should be nearly identical
        const matchesTotal = Math.abs(amt - order.total) < 0.05;
        const matchesSubtotal = order.subtotal != null && Math.abs(amt - order.subtotal) < 0.05;
        if (!matchesTotal && !matchesSubtotal) return false;
        // Must be submitted within 24 hours of the order
        const purchaseDate = new Date(purchase.created_date).getTime();
        return Math.abs(purchaseDate - orderDate) <= ONE_DAY_MS;
      });
      if (match) map.set(order.id, match);
    });
    return map;
  }, [allOrders, approvedPurchases]);

  // Filter eligible POS orders
  const { eligibleOrders, flaggedOrders, excludedOrders } = useMemo(() => {
    const processedOrderIds = new Set(existingDistributions.map(d => d.order_id));

    const eligible = [];
    const excluded = [];

    allOrders.forEach(order => {
      if (!order.customer_id) return;

      const validStatuses = ["completed", "paid", "ready"];
      if (!validStatuses.includes(order.status)) return;
      if (order.cashback_distributed || order.auto_cashback_generated) return;
      if (order.receipt_usage_type === "utilize_cashback" || (order.cashback_used && order.cashback_used > 0)) return;
      if (processedOrderIds.has(order.id)) return;

      const customer = clients.find(c => c.id === order.customer_id);
      if (!customer) return;
      // Exclude only if explicitly marked as non-loyalty (POS-only customers)
      if (customer.loyalty_program_enrolled === false) return;
      if (!customer.name || !customer.email || !customer.phone) return;

      if (order.cashback_excluded_by_admin) {
        excluded.push(order);
      } else {
        eligible.push(order);
      }
    });

    // Separate flagged (matching purchase submission) from clean eligible
    const flagged = eligible.filter(o => purchaseSubmissionMatchMap.has(o.id));
    const clean = eligible.filter(o => !purchaseSubmissionMatchMap.has(o.id));

    return { eligibleOrders: clean, flaggedOrders: flagged, excludedOrders: excluded };
  }, [allOrders, existingDistributions, clients, purchaseSubmissionMatchMap]);

  // Exclude order(s) mutation
  const excludeOrderMutation = useMutation({
    mutationFn: async ({ orderIds, reason }) => {
      for (const orderId of orderIds) {
        await base44.entities.Order.update(orderId, {
          cashback_excluded_by_admin: true,
          cashback_exclusion_reason: reason
        });
      }
    },
    onSuccess: (_, { orderIds }) => {
      queryClient.invalidateQueries({ queryKey: ["posOrders"] });
      toast.success(`${orderIds.length} order(s) excluded from cashback generation`);
      setExcludeDialog({ open: false, order: null, bulk: false });
      setExclusionReason("");
      setOrdersToExclude(new Set());
      setExcludeMode(false);
      setSelectedOrders(new Set());
    },
    onError: (e) => toast.error(e.message)
  });

  // Re-include order mutation
  const reincludeOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      await base44.entities.Order.update(orderId, {
        cashback_excluded_by_admin: false,
        cashback_exclusion_reason: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posOrders"] });
      toast.success("Order re-included in cashback generation");
    },
    onError: (e) => toast.error(e.message)
  });

  // Generate cashback mutation
  const generateCashbackMutation = useMutation({
    mutationFn: async (orderIds) => {
      const results = [];
      for (const orderId of orderIds) {
        const order = allOrders.find(o => o.id === orderId);
        const customer = clients.find(c => c.id === order.customer_id);

        // Use the same breakdown logic: rule → tier → registration level
        const breakdown = calculateCashbackBreakdown(order);
        if (breakdown.selfRate === 0 && breakdown.level1Rate === 0) {
          results.push({ orderId, error: "No cashback rate found for this customer" });
          continue;
        }
        const selfCashback = breakdown.selfCashback;
        const selfPayout = breakdown.payout;
        const distribution = await base44.entities.CashbackDistributionPending.create({
          order_id: orderId,
          customer_id: customer.id,
          customer_name: customer.name,
          order_total: order.total,
          order_type: order.order_type,
          payment_method: order.payment_method,
          cashback_amount: selfCashback,
          cashback_to_customer: selfCashback,
          payout_to_customer: selfPayout,
          referral_cashback_details: [],
          status: "pending_approval"
        });
        results.push({ orderId, success: true, distribution });
      }
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      queryClient.invalidateQueries({ queryKey: ["posOrders"] });
      queryClient.invalidateQueries({ queryKey: ["existingCashbackDistributions"] });
      queryClient.invalidateQueries({ queryKey: ["pendingCashbackDistributions"] });
      toast.success(`Generated cashback for ${successful} order(s)`);
      setSelectedOrders(new Set());
    },
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  const handleGenerateCashback = () => {
    if (selectedOrders.size === 0) {
      toast.error("Please select at least one order");
      return;
    }
    if (window.confirm(`Generate cashback for ${selectedOrders.size} order(s)?`)) {
      generateCashbackMutation.mutate(Array.from(selectedOrders));
    }
  };

  const toggleOrderSelection = (orderId) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) newSelection.delete(orderId);
    else newSelection.add(orderId);
    setSelectedOrders(newSelection);
  };

  const totalEligibleCashback = Array.from(selectedOrders).reduce((sum, orderId) => {
    const order = eligibleOrders.find(o => o.id === orderId);
    if (!order) return sum;
    return sum + calculateCashbackBreakdown(order).total;
  }, 0);

  const handleExcludeClick = (e, order) => {
    e.stopPropagation();
    setExcludeDialog({ open: true, order, bulk: false });
    // Pre-fill reason if this order matches a purchase submission
    const match = purchaseSubmissionMatchMap.get(order?.id);
    setExclusionReason(match
      ? `Excluding as submitted purchase receipt #${match.receipt_number} (${match.amount} EGP) already generated cashback via purchase approval mechanism`
      : ""
    );
  };

  const toggleExcludeSelection = (orderId) => {
    const next = new Set(ordersToExclude);
    if (next.has(orderId)) next.delete(orderId);
    else next.add(orderId);
    setOrdersToExclude(next);
  };

  const handleBulkExclude = () => {
    setExcludeDialog({ open: true, order: null, bulk: true });
    setExclusionReason("");
  };

  if (ordersLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>POS Order Cashback Generation</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  const OrderCard = ({ order, isExcluded = false, isFlagged = false }) => {
    const customer = clients.find(c => c.id === order.customer_id);
    const breakdown = calculateCashbackBreakdown(order);
    const isSelected = selectedOrders.has(order.id);
    const isMarkedForExclusion = ordersToExclude.has(order.id);
    const matchedPurchase = purchaseSubmissionMatchMap.get(order.id);

    const handleClick = () => {
      if (isExcluded || isFlagged) return;
      if (excludeMode) toggleExcludeSelection(order.id);
      else toggleOrderSelection(order.id);
    };

    return (
      <div
        key={order.id}
        onClick={handleClick}
        className={`border-2 rounded-lg p-4 transition-all ${
          isExcluded
            ? "border-red-100 bg-red-50 opacity-75 cursor-default"
            : isFlagged
              ? "border-amber-400 bg-amber-50 cursor-default"
              : excludeMode
                ? isMarkedForExclusion
                  ? "border-red-400 bg-red-50 cursor-pointer"
                  : "border-slate-200 hover:border-red-200 bg-white cursor-pointer"
                : isSelected
                  ? "border-blue-500 bg-blue-50 cursor-pointer"
                  : "border-slate-200 hover:border-slate-300 bg-white cursor-pointer"
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {!isExcluded && !isFlagged && !excludeMode && (
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
              isSelected ? "bg-blue-500 border-blue-500" : "border-slate-300"
            }`}>
              {isSelected && <span className="text-white text-xs">✓</span>}
            </div>
          )}
          {!isExcluded && !isFlagged && excludeMode && (
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
              isMarkedForExclusion ? "bg-red-500 border-red-500" : "border-slate-300"
            }`}>
              {isMarkedForExclusion && <span className="text-white text-xs">✓</span>}
            </div>
          )}
          {(isExcluded || isFlagged) && (
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1">
              {isExcluded ? <Ban className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
            </div>
          )}

          {/* Order Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-semibold text-slate-900">{customer?.name || "Unknown"}</h4>
              <Badge variant="outline" className="text-xs">{order.order_type}</Badge>
              <Badge variant="outline" className="text-xs">{order.payment_method}</Badge>
              {(matchedPurchase || isFlagged) && (
                <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Duplicate Purchase Risk
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">
              #{order.id?.substring(0, 8).toUpperCase()} • {new Date(order.created_date).toLocaleDateString()}
            </p>
            {matchedPurchase && !isExcluded && (
              <p className="text-xs text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠️ Matched receipt #{matchedPurchase.receipt_number} ({formatCurrency(matchedPurchase.amount)}) — cashback likely already distributed via purchase submission. Exclude this order to avoid double cashback.
              </p>
            )}
            {isExcluded && order.cashback_exclusion_reason && (
              <p className="text-xs text-red-600 mt-1 italic">Reason: {order.cashback_exclusion_reason}</p>
            )}
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-slate-900 text-sm">{formatCurrency(order.total)}</p>
            {!isExcluded && (
              <p className="text-xs text-emerald-600 font-medium">CB: {formatCurrency(breakdown.total)}</p>
            )}
          </div>

          {/* Actions */}
          {(isFlagged || (!isExcluded && !excludeMode)) ? (
            <Button
              size="sm"
              variant={isFlagged ? "default" : "ghost"}
              className={isFlagged ? "bg-warning-600 hover:bg-warning-700 text-white flex-shrink-0 text-xs px-2" : "text-red-500 hover:bg-red-50 hover:text-red-700 flex-shrink-0 px-2"}
              onClick={(e) => handleExcludeClick(e, order)}
              title="Exclude from cashback"
            >
              {isFlagged ? <><Ban className="w-3 h-3 mr-1" />Exclude</> : <EyeOff className="w-4 h-4" />}
            </Button>
          ) : isExcluded ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-emerald-600 hover:bg-emerald-50 text-xs flex-shrink-0 px-2"
              onClick={(e) => { e.stopPropagation(); reincludeOrderMutation.mutate(order.id); }}
            >
              Re-include
            </Button>
          ) : null}
        </div>

        {/* Cashback Breakdown - visible for eligible and flagged orders */}
        {!isExcluded && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap gap-2 text-xs">
              {/* Self Cashback */}
              <div className="bg-emerald-50 border border-emerald-100 rounded p-2 min-w-[100px]">
                <p className="text-slate-500 font-medium">Self CB</p>
                <p className="font-bold text-emerald-700 text-sm">{formatCurrency(breakdown.selfCashback)}</p>
                <p className="text-slate-400">{breakdown.selfRate}%</p>
              </div>
              {/* Payout */}
              <div className="bg-violet-50 border border-violet-100 rounded p-2 min-w-[100px]">
                <p className="text-slate-500 font-medium">Payout</p>
                <p className="font-bold text-violet-700 text-sm">{formatCurrency(breakdown.payout)}</p>
                <p className="text-slate-400">{breakdown.effectivePayoutPercent}% of CB</p>
              </div>
              {/* L1 */}
              <div className="bg-blue-50 border border-blue-100 rounded p-2 min-w-[100px]">
                <p className="text-slate-500 font-medium">L1 Referrer</p>
                <p className="font-bold text-blue-700 text-sm">{formatCurrency(breakdown.level1)}</p>
                <p className="text-slate-400">{breakdown.level1Rate}%</p>
              </div>
              {/* L2 */}
              {breakdown.level2Rate > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 rounded p-2 min-w-[100px]">
                  <p className="text-slate-500 font-medium">L2 Referrer</p>
                  <p className="font-bold text-indigo-700 text-sm">{formatCurrency(breakdown.level2)}</p>
                  <p className="text-slate-400">{breakdown.level2Rate}%</p>
                </div>
              )}
              {/* L3 */}
              {breakdown.level3Rate > 0 && (
                <div className="bg-purple-50 border border-purple-100 rounded p-2 min-w-[100px]">
                  <p className="text-slate-500 font-medium">L3 Referrer</p>
                  <p className="font-bold text-purple-700 text-sm">{formatCurrency(breakdown.level3)}</p>
                  <p className="text-slate-400">{breakdown.level3Rate}%</p>
                </div>
              )}
              {/* Total */}
              <div className="bg-slate-100 border border-slate-200 rounded p-2 min-w-[100px]">
                <p className="text-slate-500 font-medium">Total CB</p>
                <p className="font-bold text-slate-800 text-sm">{formatCurrency(breakdown.total)}</p>
                <p className="text-slate-400">all levels</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>POS Order Cashback Generation</CardTitle>
              <CardDescription>
                Generate cashback for completed POS orders ({eligibleOrders.length} eligible
                {flaggedOrders.length > 0 && `, ${flaggedOrders.length} need review`}
                {excludedOrders.length > 0 && `, ${excludedOrders.length} excluded`})
              </CardDescription>
            </div>
            {excludedOrders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExcluded(!showExcluded)}
                className="text-xs flex-shrink-0"
              >
                <Ban className="w-3 h-3 mr-1" />
                {showExcluded ? "Hide" : "Show"} Excluded ({excludedOrders.length})
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Excluded orders panel */}
          {showExcluded && excludedOrders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Excluded Orders</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {excludedOrders.map(order => (
                  <OrderCard key={order.id} order={order} isExcluded />
                ))}
              </div>
              <hr />
            </div>
          )}

          {/* Flagged orders: matching a purchase submission — candidate for exclusion */}
          {flaggedOrders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800 font-semibold">
                  {flaggedOrders.length} order(s) match an approved purchase submission — cashback likely already distributed. Exclude them if confirmed.
                </p>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {flaggedOrders.map(order => (
                  <OrderCard key={order.id} order={order} isFlagged />
                ))}
              </div>
              <hr />
            </div>
          )}

          {eligibleOrders.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                No eligible orders. All POS orders from loyalty members have been processed.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Mode Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {!excludeMode ? (
                  <>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedOrders(new Set(eligibleOrders.map(o => o.id)))}>
                      Select All
                    </Button>
                    {selectedOrders.size > 0 && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedOrders(new Set())}>
                        Clear ({selectedOrders.size})
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                      onClick={() => { setExcludeMode(true); setSelectedOrders(new Set()); setOrdersToExclude(new Set()); }}
                    >
                      <EyeOff className="w-3 h-3 mr-1" /> Exclude Orders
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-red-600">Exclude Mode</span>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setOrdersToExclude(new Set(eligibleOrders.map(o => o.id)))}>
                      Select All
                    </Button>
                    {ordersToExclude.size > 0 && (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => setOrdersToExclude(new Set())}>
                        Clear ({ordersToExclude.size})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-xs ml-auto"
                      disabled={ordersToExclude.size === 0}
                      onClick={handleBulkExclude}
                    >
                      <Ban className="w-3 h-3 mr-1" /> Exclude {ordersToExclude.size > 0 ? `(${ordersToExclude.size})` : ""}
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => { setExcludeMode(false); setOrdersToExclude(new Set()); }}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              {/* Selection Summary (cashback mode) */}
              {!excludeMode && selectedOrders.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold">Selected Orders</p>
                    <p className="text-2xl font-bold text-blue-900">{selectedOrders.size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold">Total Cashback</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalEligibleCashback)}</p>
                  </div>
                </div>
              )}

              {/* Orders List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {eligibleOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>

              {/* Action Button */}
              <Button
                onClick={handleGenerateCashback}
                disabled={selectedOrders.size === 0 || generateCashbackMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                size="lg"
              >
                {generateCashbackMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                ) : (
                  <><Zap className="w-4 h-4" />Generate Cashback for {selectedOrders.size > 0 ? selectedOrders.size : "Selected"} Order(s)</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Exclude Dialog */}
      <Dialog open={excludeDialog.open} onOpenChange={(open) => !open && setExcludeDialog({ open: false, order: null, bulk: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {excludeDialog.bulk ? `Exclude ${ordersToExclude.size} Orders` : "Exclude Order from Cashback"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!excludeDialog.bulk && excludeDialog.order && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-semibold">{clients.find(c => c.id === excludeDialog.order.customer_id)?.name}</p>
                <p className="text-slate-500">Order #{excludeDialog.order.id?.substring(0, 8).toUpperCase()} • {formatCurrency(excludeDialog.order.total)}</p>
              </div>
            )}
            {excludeDialog.bulk && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                {ordersToExclude.size} orders will be excluded with the same reason.
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Reason for exclusion <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                rows={3}
                placeholder="e.g. Already processed manually, duplicate entry, test order..."
                value={exclusionReason}
                onChange={(e) => setExclusionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcludeDialog({ open: false, order: null, bulk: false })}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={!exclusionReason.trim() || excludeOrderMutation.isPending}
              onClick={() => {
                const ids = excludeDialog.bulk
                  ? Array.from(ordersToExclude)
                  : [excludeDialog.order.id];
                excludeOrderMutation.mutate({ orderIds: ids, reason: exclusionReason.trim() });
              }}
            >
              {excludeOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 mr-1" />}
              Exclude {excludeDialog.bulk ? `${ordersToExclude.size} Orders` : "Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}