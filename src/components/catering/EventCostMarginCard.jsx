import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { loadEventFinance, eventProfitability } from "./cateringFinance";

/**
 * Full cost side of the final invoice: food, staffing, equipment and logistics, and the
 * margin the event actually made on the billed total. Each cost is counted once.
 */
export default function EventCostMarginCard({ event, billedTotal }) {
  const { data, isLoading } = useQuery({
    queryKey: ["catering-event-finance", event?.id],
    queryFn: () => loadEventFinance(event),
    enabled: !!event?.id,
  });

  if (!event) return null;
  if (isLoading || !data) return <Card className="p-4 text-sm text-slate-500">Calculating event cost…</Card>;

  const r = eventProfitability(event, data);
  const revenue = Number(billedTotal) || r.revenueActual;
  const profit = revenue - r.costActual;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

  const lines = [
    { label: "Food & materials (released stock, net of returns)", value: r.costs.food },
    { label: "Staffing (labor)", value: r.costs.labor },
    { label: "Equipment usage", value: r.costs.equipmentUsage },
    { label: "Equipment damage / loss", value: r.costs.equipmentDamage },
    { label: "Logistics (transport)", value: r.costs.transport },
  ].filter((l) => l.value > 0);
  const reference = [
    r.costs.production > 0 && `production batches ${formatCurrency(r.costs.production, true)}`,
    r.costs.procurement > 0 && `purchases for this event ${formatCurrency(r.costs.procurement, true)}`,
  ].filter(Boolean);

  return (
    <Card className="p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-900">Event cost & margin</p>
      <div className="space-y-1 text-sm">
        {!r.costs.foodReady && (
          <p className="text-xs text-warning-700">Food & materials are calculated when the reconciliation is finalized; the totals below exclude them until then.</p>
        )}
        {lines.length === 0 ? (
          <p className="text-xs text-slate-400">No costs recorded yet — staffing, equipment and logistics costs appear here as they are planned.</p>
        ) : (
          lines.map((l) => (
            <div key={l.label} className="flex justify-between">
              <span className="text-slate-600">{l.label}</span>
              <span>{formatCurrency(l.value, true)}</span>
            </div>
          ))
        )}
        <div className="flex justify-between font-semibold border-t pt-1">
          <span>Total cost{r.costs.foodReady ? "" : " (before food)"}</span>
          <span>{formatCurrency(r.costActual, true)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Billed to client</span>
          <span>{formatCurrency(revenue, true)}</span>
        </div>
        <div className={`flex justify-between font-semibold ${profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
          <span>Profit · margin{r.costs.foodReady ? "" : " (before food)"}</span>
          <span>{formatCurrency(profit, true)} · {margin}%</span>
        </div>
      </div>
      {reference.length > 0 && (
        <p className="text-xs text-slate-500">Not added again, already inside food & materials: {reference.join(" · ")}.</p>
      )}
      <p className="text-xs text-slate-400">
        Quoted margin was {r.marginEstimate}% — staffing rates, equipment usage costs and vehicle rates all feed this figure.
      </p>
    </Card>
  );
}