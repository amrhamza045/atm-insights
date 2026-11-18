import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useBranch } from "@/components/branches/BranchContext";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { loadBranchFinance, rollup, monthlyTrend, totals } from "./cateringFinance";

const DIMENSIONS = [
  { key: "clientName", label: "Client" },
  { key: "eventType", label: "Event type" },
  { key: "packageName", label: "Package" },
  { key: "branchName", label: "Branch" },
  { key: "ownerEmail", label: "Booking owner" },
];

export default function CateringProfitabilityPanel() {
  const { selectedBranchId } = useBranch();
  const [dimension, setDimension] = useState("clientName");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["catering-profitability", selectedBranchId],
    queryFn: () => loadBranchFinance(selectedBranchId),
    enabled: !!selectedBranchId,
  });

  if (!selectedBranchId) return <p className="text-sm text-slate-500">Select a branch to see catering profitability.</p>;
  if (isLoading) return <p className="text-sm text-slate-500">Calculating catering profitability…</p>;

  const t = totals(rows);
  const trend = monthlyTrend(rows).map((m) => ({ month: m.key, revenue: m.revenue, profit: m.profit, margin: m.margin }));
  const groups = rollup(rows, dimension);
  const events = [...rows].sort((a, b) => (b.event.event_date || "").localeCompare(a.event.event_date || ""));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-slate-500">Realized catering revenue</p><p className="text-xl font-bold">{formatCurrency(t.revenue, true)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Actual cost</p><p className="text-xl font-bold">{formatCurrency(t.cost, true)}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Profit</p><p className={`text-xl font-bold ${t.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(t.profit, true)}</p></Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">Margin (actual vs quoted)</p>
          <p className="text-xl font-bold">{t.margin}% <span className="text-sm text-slate-400 font-normal">vs {t.estimatedMargin}%</span></p>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold text-slate-900 mb-2">Catering revenue & profit by month</h3>
        {trend.length === 0 ? (
          <p className="text-sm text-slate-500">No dated events yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v, n) => (n === "margin" ? `${v}%` : formatCurrency(v, true))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Profitability rollup</h3>
          <div className="flex flex-wrap gap-1.5">
            {DIMENSIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDimension(d.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${dimension === d.key ? "bg-warning-100 text-warning-800 border-warning-300" : "bg-white text-slate-500 border-slate-200"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-slate-500">No catering events to report on yet.</p>
        ) : (
          <div className="divide-y text-sm">
            {groups.map((g) => (
              <div key={g.key} className="py-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-800 min-w-0 truncate">{g.key} <span className="text-slate-400">· {g.events} event(s)</span></span>
                <span className="text-slate-600">
                  {formatCurrency(g.revenue, true)} rev · {formatCurrency(g.profit, true)} profit ·{" "}
                  <span className={g.margin >= g.estimatedMargin ? "text-emerald-600" : "text-red-600"}>{g.margin}%</span>{" "}
                  <span className="text-slate-400">(quoted {g.estimatedMargin}%)</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-slate-900 mb-2">Per-event: actual vs estimate</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-1.5 pr-3">Event</th>
                  <th className="py-1.5 pr-3">Revenue (quoted)</th>
                  <th className="py-1.5 pr-3">Cost (quoted)</th>
                  <th className="py-1.5 pr-3">Cost breakdown</th>
                  <th className="py-1.5 pr-3">Profit</th>
                  <th className="py-1.5">Margin vs quote</th>
                </tr>
              </thead>
              <tbody>
                {events.map((r) => (
                  <tr key={r.event.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <p className="text-slate-800">{r.event.event_name}</p>
                      <p className="text-xs text-slate-400">{r.event.event_date} · {r.clientName} · {r.packageName}</p>
                    </td>
                    <td className="py-2 pr-3">{formatCurrency(r.revenueActual, true)} <span className="text-xs text-slate-400">({formatCurrency(r.revenueEstimate, true)})</span></td>
                    <td className="py-2 pr-3">{formatCurrency(r.costActual, true)} <span className="text-xs text-slate-400">({formatCurrency(r.costEstimate, true)})</span></td>
                    <td className="py-2 pr-3 text-xs text-slate-500">
                      {r.costs.foodReady ? `food ${formatCurrency(r.costs.food, false)}` : "food pending"} · labor {formatCurrency(r.costs.labor, false)} · transport {formatCurrency(r.costs.transport, false)}
                      {r.costs.equipment > 0 ? ` · equip ${formatCurrency(r.costs.equipment, false)}` : ""}
                    </td>
                    <td className={`py-2 pr-3 font-medium ${r.profitActual >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(r.profitActual, true)}</td>
                    <td className="py-2">
                      <Badge className={`text-xs ${r.marginVariance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.marginActual}% vs {r.marginEstimate}% ({r.marginVariance >= 0 ? "+" : ""}{r.marginVariance})
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-400">
        Catering figures are built only from catering records (events, quotes, catering payments, actual event costs and trips). Food is each event's actual cost (stock released to it, net of returns), shown once the reconciliation is finalized; production batches and purchase orders are not added on top, because they are the same stock. POS orders are never included, and catering payments are never counted as POS sales — so no figure is double-counted.
      </p>
    </div>
  );
}