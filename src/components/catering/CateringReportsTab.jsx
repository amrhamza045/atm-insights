import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { useBranch } from "@/components/branches/BranchContext";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import CateringProfitabilityPanel from "./CateringProfitabilityPanel";
import { useCateringFilter } from "@/components/executive/catering/CateringFilterContext";

export default function CateringReportsTab() {
  const { selectedBranchId } = useBranch();
  const venue = useCateringFilter();

  const { data: allEvents = [] } = useQuery({
    queryKey: ["catering-events", selectedBranchId],
    queryFn: () => base44.entities.CateringEvent.filter({ branch_id: selectedBranchId }, "-event_date", 200),
    enabled: !!selectedBranchId,
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["catering-payments-branch", selectedBranchId],
    queryFn: () => base44.entities.CateringPayment.filter({ branch_id: selectedBranchId }, "-payment_date", 500),
    enabled: !!selectedBranchId,
  });

  const { data: allQuotes = [] } = useQuery({
    queryKey: ["catering-quotes-active", selectedBranchId],
    queryFn: () => base44.entities.CateringQuote.filter({ branch_id: selectedBranchId, status: "active" }, "-created_date", 300),
    enabled: !!selectedBranchId,
  });

  // Venue filter (from the Executive Dashboard) narrows within the branch scope;
  // outside that dashboard it is inactive and passes everything through.
  const events = venue.filterEvents(allEvents);
  const payments = venue.filterByEvent(allPayments, allEvents);
  const quotes = venue.filterByEvent(allQuotes, allEvents);

  const stats = useMemo(() => {
    const collected = payments.reduce((s, p) => s + (p.payment_type === "refund" ? -1 : 1) * (Number(p.amount) || 0), 0);
    const booked = events.filter((e) => e.status !== "cancelled").reduce((s, e) => s + (Number(e.quote_total) || 0), 0);
    const outstanding = events.filter((e) => e.status !== "cancelled").reduce((s, e) => s + Math.max(0, Number(e.balance_due) || 0), 0);
    const cancelled = events.filter((e) => e.status === "cancelled").length;
    return { collected, booked, outstanding, cancelled };
  }, [events, payments]);

  const topItems = useMemo(() => {
    const map = {};
    quotes.forEach((q) => (q.line_items || []).forEach((li) => {
      const k = li.name || "Unnamed";
      map[k] = map[k] || { name: k, revenue: 0, cost: 0, qty: 0 };
      map[k].revenue += Number(li.line_total) || 0;
      map[k].cost += Number(li.line_cost) || 0;
      map[k].qty += Number(li.quantity) || 0;
    }));
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [quotes]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Catering revenue collected", stats.collected],
          ["Booked (active quotes)", stats.booked],
          ["Outstanding balance", stats.outstanding],
        ].map(([label, val]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(val, true)}</p>
          </Card>
        ))}
        <Card className="p-4">
          <p className="text-xs text-slate-500">Cancelled events</p>
          <p className="text-xl font-bold text-slate-900">{stats.cancelled}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold text-slate-900 mb-2">Top catering line items</h3>
        {topItems.length === 0 ? (
          <p className="text-sm text-slate-500">No quoted line items yet.</p>
        ) : (
          <div className="divide-y">
            {topItems.map((it) => (
              <div key={it.name} className="py-2 flex items-center justify-between text-sm">
                <span className="text-slate-700">{it.name} <span className="text-slate-400">× {it.qty}</span></span>
                <span className="text-slate-600">
                  {formatCurrency(it.revenue, true)} · margin {formatCurrency(it.revenue - it.cost, true)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CateringProfitabilityPanel />
    </div>
  );
}