import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, Factory, TrendingUp, Package, PoundSterling, ClipboardList } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import SourcingComparison from "@/components/shared/SourcingComparison";


const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];
const STATUS_COLORS = {
  pending: "#94a3b8",
  in_progress: "#3b82f6",
  completed: "#10b981",
  cancelled: "#ef4444",
};

export default function ManufacturingAnalytics() {
  // Tabs closed in Admin › Modules are left out.
  const screenTabs = useScreenTabs("ManufacturingAnalytics");
  const firstTab = screenTabs.pick("overview", ["overview", "sourcing"]);
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  const allowed = isAdmin || !!(permissions?.manufacturing_view || permissions?.manufacturing_edit);

  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list("-created_date"),
  });
  const { data: allOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["productionOrders"],
    queryFn: () => base44.entities.ProductionOrder.list("-created_date"),
  });

  // This page reports on catering-sourced production batches only.
  const orders = useMemo(() => allOrders.filter((o) => o.order_source === "catering"), [allOrders]);

  const isLoading = recipesLoading || ordersLoading;

  const kpis = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status === "in_progress" || o.status === "pending");
    const completedOrders = orders.filter((o) => o.status === "completed");
    const totalCost = completedOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
    const avgCost = completedOrders.length > 0 ? totalCost / completedOrders.length : 0;
    return { totalRecipes: recipes.length, activeOrders: activeOrders.length, completedOrders: completedOrders.length, totalCost, avgCost };
  }, [recipes, orders]);

  const statusData = useMemo(() => {
    const counts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => { if (counts[o.status] !== undefined) counts[o.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const costByRecipe = useMemo(() => {
    const map = {};
    orders.filter((o) => o.status === "completed").forEach((o) => {
      const name = o.recipe_name || "Unknown";
      if (!map[name]) map[name] = { name, cost: 0, orders: 0 };
      map[name].cost += o.total_cost || 0;
      map[name].orders += 1;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost).slice(0, 8);
  }, [orders]);

  const varianceData = useMemo(() => {
    return orders
      .filter((o) => o.status === "completed" && o.actual_output_quantity != null)
      .slice(0, 12)
      .map((o) => ({
        name: (o.recipe_name || "Order").substring(0, 15),
        target: o.target_quantity || 0,
        actual: o.actual_output_quantity || 0,
      }));
  }, [orders]);

  const costTrend = useMemo(() => {
    const map = {};
    orders.filter((o) => o.status === "completed" && o.completed_date).forEach((o) => {
      const date = new Date(o.completed_date).toISOString().slice(0, 10);
      if (!map[date]) map[date] = { date, cost: 0 };
      map[date].cost += o.total_cost || 0;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-15);
  }, [orders]);

  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-slate-500">You don't have permission to access Manufacturing Analytics.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Factory className="w-6 h-6 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manufacturing Analytics</h1>
            <p className="text-sm text-slate-500">Production batches planned for catering events</p>
          </div>
        </div>
      </div>

      {!firstTab ? <ClosedTabsNotice /> : (
      <Tabs defaultValue={firstTab} className="w-full">
        <TabsList>
          {screenTabs.isOpen("overview") && <TabsTrigger value="overview">Overview</TabsTrigger>}
          {screenTabs.isOpen("sourcing") && <TabsTrigger value="sourcing">Sourcing Comparison</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard icon={<ClipboardList className="w-4 h-4" />} label="Total Recipes" value={kpis.totalRecipes} />
            <KpiCard icon={<Package className="w-4 h-4" />} label="Active Orders" value={kpis.activeOrders} tone="blue" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Completed Orders" value={kpis.completedOrders} tone="green" />
            <KpiCard icon={<PoundSterling className="w-4 h-4" />} label="Total Production Cost" value={formatCurrency(kpis.totalCost)} />
            <KpiCard icon={<PoundSterling className="w-4 h-4" />} label="Avg Cost / Order" value={formatCurrency(kpis.avgCost)} tone="amber" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Production Orders by Status</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Recipes by Production Cost</h3>
              {costByRecipe.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={costByRecipe} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="cost" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Target vs Actual Output</h3>
              {varianceData.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={varianceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="target" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Target" />
                    <Bar dataKey="actual" fill="#10b981" radius={[4, 4, 0, 0]} name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Production Cost Trend</h3>
              {costTrend.length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={costTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Detail Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Recent Production Orders</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Output Item</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-6">No production orders yet</TableCell></TableRow>
                ) : orders.slice(0, 20).map((o) => {
                  const variance = o.actual_output_quantity != null ? o.actual_output_quantity - (o.target_quantity || 0) : null;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.recipe_name || "—"}</TableCell>
                      <TableCell className="text-sm">{o.output_item_name || "—"}</TableCell>
                      <TableCell className="text-right">{o.target_quantity || 0}</TableCell>
                      <TableCell className="text-right">
                        {o.actual_output_quantity ?? "—"}
                        {variance != null && (
                          <span className={`ml-1 text-xs ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ({variance >= 0 ? "+" : ""}{variance.toFixed(1)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{o.total_cost ? formatCurrency(o.total_cost) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ color: STATUS_COLORS[o.status], borderColor: STATUS_COLORS[o.status] }} className="capitalize">
                          {o.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="sourcing">
          <SourcingComparison />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, tone }) {
  const toneClass = tone === "blue" ? "text-blue-600 bg-blue-50" : tone === "green" ? "text-green-600 bg-green-50" : tone === "amber" ? "text-amber-600 bg-amber-50" : "text-slate-700 bg-slate-50";
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1 rounded ${toneClass}`}>{icon}</div>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </Card>
  );
}

function EmptyChart() {
  return <div className="flex items-center justify-center h-[260px] text-sm text-slate-400">No data available</div>;
}