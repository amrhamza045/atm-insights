import React, { useMemo, useState } from "react";
import { Clock, TrendingUp, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import moment from "moment";

function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes)) return "—";
  if (minutes < 1) return "< 1m";
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  if (m < 60) return `${m}m${s > 0 ? ` ${s}s` : ""}`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

function calcMinutes(from, to) {
  if (!from || !to) return null;
  const diff = moment(to).diff(moment(from), "minutes", true);
  return diff >= 0 ? diff : null;
}

const STAGE_COLORS = {
  toKitchen: "amber",
  toDelivery: "blue",
  total: "slate",
};

const colorMap = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-400" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", bar: "bg-blue-400" },
  slate: { bg: "bg-slate-100", text: "text-slate-700", bar: "bg-slate-500" },
  red: { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-400" },
};

export default function DeliveryPartnerPerformance({ orders, deliveryCompanies = [] }) {
  const partnerStats = useMemo(() => {
    const delivered = orders.filter(o => o.delivery_status === "delivered" && o.delivery_delivered_at);
    const map = {};

    for (const o of delivered) {
      const partnerName = o.delivery_company_name || "Unassigned";
      if (!map[partnerName]) {
        map[partnerName] = { name: partnerName, toKitchen: [], toDelivery: [], total: [], count: 0, slowCount: 0 };
      }
      map[partnerName].count += 1;

      const created = o.created_date;
      const ready = o.kitchen_ready_at;
      const deliveredAt = o.delivery_delivered_at;

      const kitchenMin = ready ? calcMinutes(created, ready) : null;
      const deliveryMin = ready ? calcMinutes(ready, deliveredAt) : calcMinutes(created, deliveredAt);
      const totalMin = calcMinutes(created, deliveredAt);

      if (kitchenMin != null) map[partnerName].toKitchen.push(kitchenMin);
      if (deliveryMin != null) map[partnerName].toDelivery.push(deliveryMin);
      if (totalMin != null) {
        map[partnerName].total.push(totalMin);
        if (totalMin > 45) map[partnerName].slowCount += 1;
      }
    }

    const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

    return Object.values(map)
      .map(s => ({
        ...s,
        avgToKitchen: avg(s.toKitchen),
        avgToDelivery: avg(s.toDelivery),
        avgTotal: avg(s.total),
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // Find the bottleneck stage globally
  const globalBottleneck = useMemo(() => {
    if (partnerStats.length === 0) return null;
    let maxKitchen = 0, maxDelivery = 0;
    for (const p of partnerStats) {
      if (p.avgToKitchen != null) maxKitchen = Math.max(maxKitchen, p.avgToKitchen);
      if (p.avgToDelivery != null) maxDelivery = Math.max(maxDelivery, p.avgToDelivery);
    }
    if (maxKitchen === 0 && maxDelivery === 0) return null;
    return maxKitchen > maxDelivery
      ? { stage: "Order → Kitchen Ready", minutes: maxKitchen }
      : { stage: "Kitchen Ready → Delivered", minutes: maxDelivery };
  }, [partnerStats]);

  if (partnerStats.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No completed deliveries with partner data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bottleneck alert */}
      {globalBottleneck && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-red-800">Top bottleneck: </span>
            <span className="text-red-700">
              "{globalBottleneck.stage}" takes up to {formatDuration(globalBottleneck.minutes)} for some partners.
            </span>
          </div>
        </div>
      )}

      {/* Stage legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <LegendItem color="amber" label="Order → Kitchen Ready" />
        <LegendItem color="blue" label="Kitchen Ready → Delivered" />
        <LegendItem color="slate" label="Total (Order → Delivered)" />
      </div>

      {/* Per-partner rows */}
      <div className="space-y-3">
        {partnerStats.map(partner => (
          <PartnerRow key={partner.name} partner={partner} />
        ))}
      </div>

      {/* Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
        <p>
          Based on <span className="font-semibold">{partnerStats.reduce((s, p) => s + p.count, 0)}</span> completed deliveries
          across <span className="font-semibold">{partnerStats.length}</span> delivery {partnerStats.length === 1 ? "partner" : "partners"}.
          Shorter bars = faster. Click a partner for stage breakdown.
        </p>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  const c = colorMap[color];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded ${c.bar}`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}

function PartnerRow({ partner }) {
  const [expanded, setExpanded] = useState(false);

  // Max value for bar scaling
  const maxVal = Math.max(partner.avgToKitchen || 0, partner.avgToDelivery || 0, partner.avgTotal || 0, 1);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <span className="font-medium text-slate-800 text-sm">{partner.name}</span>
          <span className="text-xs text-slate-400">({partner.count} delivered)</span>
          {partner.slowCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
              {partner.slowCount} slow
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">Avg total: <span className="font-bold text-slate-800">{formatDuration(partner.avgTotal)}</span></span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
          <StageBar
            label="Order → Kitchen Ready"
            value={partner.avgToKitchen}
            maxVal={maxVal}
            color="amber"
            sub="Time from order creation to kitchen marking it ready"
          />
          <StageBar
            label="Kitchen Ready → Delivered"
            value={partner.avgToDelivery}
            maxVal={maxVal}
            color="blue"
            sub="Time from kitchen ready to final delivery (includes pickup & transit)"
          />
          <StageBar
            label="Total: Order → Delivered"
            value={partner.avgTotal}
            maxVal={maxVal}
            color="slate"
            sub="Full end-to-end delivery time"
          />
        </div>
      )}
    </div>
  );
}

function StageBar({ label, value, maxVal, color, sub }) {
  const c = colorMap[color];
  const pct = value != null ? Math.min((value / maxVal) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className={`text-xs font-medium ${c.text}`}>{label}</span>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>
        <span className="text-sm font-bold text-slate-800">{formatDuration(value)}</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${c.bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}