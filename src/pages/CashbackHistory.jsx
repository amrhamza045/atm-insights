import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PoundSterling, TrendingUp, Wallet, Gift, Users, Trophy,
  Loader2, Search, Layers, CheckCircle2, XCircle, Clock, Zap
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import RestaurantLogo from "@/components/RestaurantLogo";

const TX_TYPE_CONFIG = {
  order_cashback:    { label: "Order Cashback",    color: "bg-emerald-100 text-emerald-700", icon: TrendingUp },
  referral_cashback: { label: "Referral Cashback", color: "bg-blue-100 text-blue-700",     icon: Users },
  welcome_cashback:  { label: "Welcome Bonus",     color: "bg-purple-100 text-purple-700", icon: Gift },
  self_cashback:     { label: "Self Cashback",     color: "bg-green-100 text-green-700",   icon: TrendingUp },
  milestone_bonus:   { label: "Milestone Bonus",   color: "bg-amber-100 text-amber-700",   icon: Trophy },
};

const DIST_STATUS_CONFIG = {
  pending_approval: { label: "Pending",  color: "bg-amber-100 text-amber-700",  icon: Clock },
  approved:         { label: "Approved", color: "bg-blue-100 text-blue-700",    icon: CheckCircle2 },
  executed:         { label: "Executed", color: "bg-emerald-100 text-emerald-700", icon: Zap },
  rejected:         { label: "Rejected", color: "bg-red-100 text-red-700",      icon: XCircle },
};

import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

export default function CashbackHistory() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all"); // "transactions" | "distributions" | "all"
  const [dateFilter, setDateFilter] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  const canAudit = isAdmin || permissions?.rewards_manage === true;

  // Admin: load all; client: load own
  const { data: client } = useQuery({
    queryKey: ["client", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const clients = await base44.entities.Client.filter({ email: currentUser.email });
      return clients[0] || null;
    },
    enabled: !!currentUser?.email && !canAudit
  });

  const { data: allTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["allCashbackTransactions"],
    queryFn: () => base44.entities.CashbackTransaction.list("-created_date", 500),
    enabled: canAudit
  });

  const { data: clientTransactions = [], isLoading: clientTxLoading } = useQuery({
    queryKey: ["cashbackTransactions", client?.id],
    queryFn: () => base44.entities.CashbackTransaction.filter({ client_id: client.id }, "-created_date"),
    enabled: !!client?.id && !canAudit
  });

  const { data: distributions = [], isLoading: distLoading } = useQuery({
    queryKey: ["allCashbackDistributions"],
    queryFn: () => base44.entities.CashbackDistributionPending.list("-created_date", 500),
    enabled: canAudit
  });

  const transactions = canAudit ? allTransactions : clientTransactions;
  const isLoading = txLoading || clientTxLoading || distLoading;

  // Date range helper
  const dateThreshold = useMemo(() => {
    if (dateFilter === "today") return new Date(new Date().setHours(0,0,0,0));
    if (dateFilter === "7days") return new Date(Date.now() - 7 * 86400000);
    if (dateFilter === "30days") return new Date(Date.now() - 30 * 86400000);
    return null;
  }, [dateFilter]);

  // Merged rows with a unified shape
  const allRows = useMemo(() => {
    const txRows = transactions.map(t => ({
      id: t.id,
      _source: "transaction",
      date: new Date(t.created_date),
      customer: t.client_name,
      customer_id: t.client_id,
      order_id: t.description?.match(/#([a-f0-9]+)/i)?.[1] || null,
      type: t.transaction_type,
      amount: t.amount || 0,
      cashback_amount: t.cashback_amount || 0,
      payout_amount: t.payout_amount || 0,
      referral_level: t.referral_level,
      from_client: t.source_client_name !== t.client_name ? t.source_client_name : null,
      status: "executed",
      description: t.description,
      raw: t
    }));

    const distRows = distributions.map(d => ({
      id: d.id,
      _source: "distribution",
      date: new Date(d.created_date),
      customer: d.customer_name,
      customer_id: d.customer_id,
      order_id: d.order_id,
      type: "distribution",
      amount: d.cashback_amount || 0,
      cashback_amount: d.cashback_to_customer || 0,
      payout_amount: d.payout_to_customer || 0,
      referral_level: null,
      from_client: null,
      status: d.status,
      description: `${d.order_type} • ${d.payment_method}`,
      approved_by: d.approved_by,
      executed_by: d.executed_by,
      rejection_reason: d.rejection_reason,
      raw: d
    }));

    return [...txRows, ...distRows].sort((a, b) => b.date - a.date);
  }, [transactions, distributions]);

  const filtered = useMemo(() => {
    return allRows.filter(row => {
      if (sourceFilter === "transactions" && row._source !== "transaction") return false;
      if (sourceFilter === "distributions" && row._source !== "distribution") return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (dateThreshold && row.date < dateThreshold) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !row.customer?.toLowerCase().includes(q) &&
          !row.order_id?.toLowerCase().includes(q) &&
          !row.description?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allRows, sourceFilter, statusFilter, typeFilter, dateThreshold, search]);

  // Summary stats
  const totalCashback = filtered.reduce((s, r) => s + r.cashback_amount, 0);
  const totalPayout = filtered.reduce((s, r) => s + r.payout_amount, 0);
  const executedCount = filtered.filter(r => r.status === "executed").length;
  const pendingCount = filtered.filter(r => r.status === "pending_approval").length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!canAudit && !client) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="p-12 text-center">
          <p className="text-slate-500">Please register to view your cashback history</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">

        {/* Header */}
        <div>
          <RestaurantLogo className="h-10 mb-2" />
          <h1 className="text-3xl font-bold text-slate-900">Cashback History</h1>
          <p className="text-slate-500 mt-1">
            {canAudit ? "Full audit log of all cashback transactions and distributions" : "Your cashback earnings and history"}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Cashback</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalCashback)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Payout</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(totalPayout)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Executed</p>
                <p className="text-lg font-bold text-amber-700">{executedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-lg font-bold text-orange-700">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by customer, order ID, description…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {canAudit && (
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="transactions">Transactions</SelectItem>
                    <SelectItem value="distributions">Distributions</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="executed">Executed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="order_cashback">Order Cashback</SelectItem>
                  <SelectItem value="referral_cashback">Referral Cashback</SelectItem>
                  <SelectItem value="welcome_cashback">Welcome Bonus</SelectItem>
                  <SelectItem value="milestone_bonus">Milestone Bonus</SelectItem>
                  <SelectItem value="distribution">Distribution</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-500 ml-auto">{filtered.length} records</span>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaction Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <PoundSterling className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No records match your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left p-3 pl-4">Date</th>
                      <th className="text-left p-3">Customer</th>
                      {canAudit && <th className="text-left p-3">Order ID</th>}
                      <th className="text-left p-3">Type</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Cashback</th>
                      <th className="text-right p-3">Payout</th>
                      <th className="text-right p-3 pr-4">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(row => {
                      const txCfg = TX_TYPE_CONFIG[row.type];
                      const stCfg = DIST_STATUS_CONFIG[row.status] || DIST_STATUS_CONFIG.executed;
                      const Icon = txCfg?.icon || Layers;
                      const StatusIcon = stCfg.icon;

                      return (
                        <tr key={`${row._source}-${row.id}`} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 pl-4 text-slate-500 whitespace-nowrap">
                            {format(row.date, "MMM d, yyyy")}
                            <div className="text-xs text-slate-400">{format(row.date, "h:mm a")}</div>
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-slate-900">{row.customer}</p>
                            {row.from_client && (
                              <p className="text-xs text-slate-400">From: {row.from_client} {row.referral_level ? `(L${row.referral_level})` : ""}</p>
                            )}
                            {row.description && !row.from_client && (
                              <p className="text-xs text-slate-400 truncate max-w-[180px]">{row.description}</p>
                            )}
                            {row.rejection_reason && (
                              <p className="text-xs text-red-500 truncate max-w-[180px]">❌ {row.rejection_reason}</p>
                            )}
                          </td>
                          {canAudit && (
                            <td className="p-3 font-mono text-xs text-slate-500">
                              {row.order_id ? `#${row.order_id.slice(-8).toUpperCase()}` : "—"}
                            </td>
                          )}
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${txCfg?.color || "bg-slate-100 text-slate-600"}`}>
                              <Icon className="w-3 h-3" />
                              {txCfg?.label || (row.type === "distribution" ? "Distribution" : row.type)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${stCfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {stCfg.label}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-emerald-700">
                            {formatCurrency(row.cashback_amount)}
                          </td>
                          <td className="p-3 text-right font-semibold text-blue-700">
                            {formatCurrency(row.payout_amount)}
                          </td>
                          <td className="p-3 pr-4 text-right font-bold text-slate-900">
                            {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}