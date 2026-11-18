import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, Beef, TrendingUp, PoundSterling, Scale, Percent } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import SourcingComparison from "@/components/shared/SourcingComparison";

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function ButcheryAnalytics() {
  // Tabs closed in Admin › Modules are left out.
  const screenTabs = useScreenTabs("ButcheryAnalytics");
  const firstTab = screenTabs.pick("overview", ["overview", "sourcing"]);
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  const allowed = isAdmin || !!(permissions?.butchery_view || permissions?.butchery_edit);

  const { data: animals = [], isLoading: aLoading } = useQuery({
    queryKey: ["animals"],
    queryFn: () => base44.entities.Animal.list("-created_date"),
  });
  const { data: events = [], isLoading: eLoading } = useQuery({
    queryKey: ["slaughterEvents"],
    queryFn: () => base44.entities.SlaughterEvent.list("-created_date"),
  });
  const { data: rawMaterials = [], isLoading: rLoading } = useQuery({
    queryKey: ["butcheryRawMaterials"],
    queryFn: () => base44.entities.ButcheryRawMaterial.list("-created_date"),
  });
  const { data: cuts = [], isLoading: cLoading } = useQuery({
    queryKey: ["primalCutsAll"],
    queryFn: () => base44.entities.PrimalCut.list("-created_date"),
  });
  const { data: byproducts = [], isLoading: bLoading } = useQuery({
    queryKey: ["wasteByProductsAll"],
    queryFn: () => base44.entities.WasteByProduct.list("-created_date"),
  });
  const { data: suppliers = [], isLoading: sLoading } = useQuery({
    queryKey: ["butcherySuppliers"],
    queryFn: () => base44.entities.ButcherySupplier.list("name"),
  });

  const isLoading = aLoading || eLoading || rLoading || cLoading || bLoading || sLoading;

  const kpis = useMemo(() => {
    const processed = events.length;
    const avgDressing = events.length > 0 ? events.reduce((s, e) => s + (e.dressing_percentage || 0), 0) / events.length : 0;
    const totalCost = events.reduce((s, e) => s + (e.total_cost || 0), 0);
    const sold = rawMaterials.filter((r) => r.status === "sold");
    const totalRevenue = sold.reduce((s, r) => s + (r.sale_price || 0), 0);
    const totalMargin = sold.reduce((s, r) => s + (r.actual_margin || 0), 0);
    const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    return { processed, avgDressing, totalCost, totalRevenue, totalMargin, marginPct, soldCount: sold.length };
  }, [events, rawMaterials]);

  const marginByGrade = useMemo(() => {
    const map = {};
    rawMaterials.filter((r) => r.status === "sold").forEach((r) => {
      const g = r.quality_grade || "ungraded";
      if (!map[g]) map[g] = { name: g, revenue: 0, margin: 0, count: 0 };
      map[g].revenue += r.sale_price || 0;
      map[g].margin += r.actual_margin || 0;
      map[g].count += 1;
    });
    return Object.values(map).sort((a, b) => b.margin - a.margin);
  }, [rawMaterials]);

  const costBreakdown = useMemo(() => {
    const purchase = animals.reduce((s, a) => s + (a.purchase_cost || 0), 0);
    const processing = events.reduce((s, e) => s + (e.processing_cost_share || 0), 0);
    const disposal = events.reduce((s, e) => s + (e.disposal_cost || 0), 0);
    const recovery = byproducts.filter((b) => b.type === "by_product").reduce((s, b) => s + (b.recovery_value || 0), 0);
    return [
      { name: "Purchase", value: purchase },
      { name: "Processing", value: processing },
      { name: "Disposal", value: disposal },
      { name: "Recovery Offset", value: -recovery },
    ].filter((d) => d.value !== 0);
  }, [animals, events, byproducts]);

  const yieldBySpecies = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const animal = animals.find((a) => a.id === e.animal_id);
      const sp = animal?.species || "unknown";
      if (!map[sp]) map[sp] = { name: sp, count: 0, dressingSum: 0, totalCost: 0 };
      map[sp].count += 1;
      map[sp].dressingSum += e.dressing_percentage || 0;
      map[sp].totalCost += e.total_cost || 0;
    });
    return Object.values(map).map((s) => ({ ...s, avgDressing: s.count > 0 ? s.dressingSum / s.count : 0 }));
  }, [events, animals]);

  const recoveryByCategory = useMemo(() => {
    const map = {};
    byproducts.filter((b) => b.type === "by_product").forEach((b) => {
      const cat = b.category || "other";
      if (!map[cat]) map[cat] = { name: cat, recovery: 0, weight: 0 };
      map[cat].recovery += b.recovery_value || 0;
      map[cat].weight += b.weight || 0;
    });
    return Object.values(map).sort((a, b) => b.recovery - a.recovery);
  }, [byproducts]);

  const marginBySupplier = useMemo(() => {
    const map = {};
    rawMaterials.filter((r) => r.status === "sold").forEach((r) => {
      const sName = r.supplier_name || "Unknown";
      if (!map[sName]) map[sName] = { name: sName, revenue: 0, margin: 0, count: 0 };
      map[sName].revenue += r.sale_price || 0;
      map[sName].margin += r.actual_margin || 0;
      map[sName].count += 1;
    });
    return Object.values(map).sort((a, b) => b.margin - a.margin);
  }, [rawMaterials]);

  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-slate-500">You don't have permission to access Butchery Analytics.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Beef className="w-6 h-6 text-red-600" />
        <h1 className="text-2xl font-bold text-slate-900">Butchery Analytics</h1>
      </div>

      {!firstTab ? <ClosedTabsNotice /> : (
      <Tabs defaultValue={firstTab} className="w-full">
        <TabsList>
          {screenTabs.isOpen("overview") && <TabsTrigger value="overview">Overview</TabsTrigger>}
          {screenTabs.isOpen("sourcing") && <TabsTrigger value="sourcing">Sourcing Comparison</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard icon={<Beef className="w-4 h-4" />} label="Animals Processed" value={kpis.processed} />
            <KpiCard icon={<Percent className="w-4 h-4" />} label="Avg Dressing %" value={`${kpis.avgDressing.toFixed(1)}%`} tone="blue" />
            <KpiCard icon={<PoundSterling className="w-4 h-4" />} label="Total Cost" value={formatCurrency(kpis.totalCost)} />
            <KpiCard icon={<PoundSterling className="w-4 h-4" />} label="Total Revenue" value={formatCurrency(kpis.totalRevenue)} tone="green" />
            <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Total Margin" value={formatCurrency(kpis.totalMargin)} tone={kpis.totalMargin >= 0 ? "green" : "red"} />
            <KpiCard icon={<Scale className="w-4 h-4" />} label="Margin %" value={`${kpis.marginPct.toFixed(1)}%`} tone={kpis.marginPct >= 0 ? "green" : "red"} />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Margin by Quality Grade</h3>
              {marginByGrade.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={marginByGrade}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="capitalize" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="margin" fill="#10b981" radius={[4, 4, 0, 0]} name="Margin" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Cost Breakdown</h3>
              {costBreakdown.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${formatCurrency(value)}`}>
                      {costBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Avg Dressing % by Species</h3>
              {yieldBySpecies.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={yieldBySpecies}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} className="capitalize" />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="avgDressing" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Avg Dressing %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">By-Product Recovery Value by Category</h3>
              {recoveryByCategory.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={recoveryByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="recovery" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Supplier Margin Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Margin by Supplier</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Items Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marginBySupplier.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-6">No sold items yet</TableCell></TableRow>
                ) : marginBySupplier.map((s) => {
                  const mPct = s.revenue > 0 ? (s.margin / s.revenue) * 100 : 0;
                  return (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.revenue)}</TableCell>
                      <TableCell className={`text-right font-medium ${s.margin >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(s.margin)}</TableCell>
                      <TableCell className={`text-right ${mPct >= 0 ? "text-green-600" : "text-red-600"}`}>{mPct.toFixed(1)}%</TableCell>
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
  const toneClass = tone === "blue" ? "text-blue-600 bg-blue-50" : tone === "green" ? "text-green-600 bg-green-50" : tone === "amber" ? "text-amber-600 bg-amber-50" : tone === "red" ? "text-red-600 bg-red-50" : "text-slate-700 bg-slate-50";
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
  return <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">No data available</div>;
}