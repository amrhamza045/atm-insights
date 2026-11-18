import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus, Activity, PoundSterling } from "lucide-react";

const fmt = (n) => Math.round(n).toLocaleString("en-US");

function Kpi({ icon: Icon, label, value, sub, tint }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Icon className={`w-4 h-4 ${tint}`} />
          {label}
        </div>
        <p className="text-2xl font-bold text-slate-900 mt-1.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function ClientKpiRow({ total, newInPeriod, periodDays, active, dormant, lifetimeSpend }) {
  const activePct = total ? Math.round((active / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <Kpi icon={Users} tint="text-blue-600" label="Total clients" value={fmt(total)} sub="Excludes merged records" />
      <Kpi
        icon={UserPlus}
        tint="text-violet-600"
        label={`New — last ${periodDays} days`}
        value={fmt(newInPeriod)}
        sub="Registration date based"
      />
      <Kpi
        icon={Activity}
        tint="text-emerald-600"
        label="Active vs dormant"
        value={`${fmt(active)} / ${fmt(dormant)}`}
        sub={`${activePct}% active — health score based`}
      />
      <Kpi
        icon={PoundSterling}
        tint="text-amber-600"
        label="Lifetime spend (base)"
        value={`${fmt(lifetimeSpend)} EGP`}
        sub="Sum of recorded client spend"
      />
    </div>
  );
}