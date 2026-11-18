import React from "react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function PackageEconomicsBar({ economics, guests, label = "At this guest count" }) {
  const low = economics.margin_pct < 20;
  return (
    <div className={`rounded-lg border p-3 ${low ? "border-warning-300 bg-warning-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className="text-xs font-semibold text-slate-700 mb-1">
        {label}{guests != null ? ` — ${guests} guests` : ""}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div><p className="text-xs text-slate-500">Selling price</p><p className="font-semibold text-slate-900">{formatCurrency(economics.price, true)}</p></div>
        <div><p className="text-xs text-slate-500">Est. cost</p><p className="font-semibold text-slate-900">{formatCurrency(economics.cost, true)}</p></div>
        <div><p className="text-xs text-slate-500">Profit</p><p className="font-semibold text-slate-900">{formatCurrency(economics.profit, true)}</p></div>
        <div><p className="text-xs text-slate-500">Margin</p><p className={`font-semibold ${low ? "text-warning-700" : "text-emerald-700"}`}>{economics.margin_pct}%</p></div>
      </div>
      {low && <p className="text-xs text-warning-700 mt-1">Margin is below 20% — review pricing before sending.</p>}
    </div>
  );
}