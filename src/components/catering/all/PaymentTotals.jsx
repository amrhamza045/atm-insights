import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import { OUTFLOWS } from "@/components/catering/retainedFunds";

/** Money received, paid back and awaiting approval, totalled by the server. */
export default function PaymentTotals({ query, enabled = true }) {
  const { selectedBranchId } = useBranch();
  const where = { branch_id: selectedBranchId, ...query };
  const { data: rows = [] } = useQuery({
    queryKey: ["catering-payments", "all-events-totals", where],
    queryFn: async () =>
      (await base44.entities.CateringPayment.aggregate({ query: where, groupBy: ["status", "payment_type"], sum: ["amount"] })).rows,
    enabled: enabled && !!selectedBranchId,
  });
  const sum = (match) => rows.filter(match).reduce((s, r) => s + (Number(r.sum_amount) || 0), 0);
  const completed = (outgoing) => (r) => r.status === "completed" && OUTFLOWS.includes(r.payment_type) === outgoing;
  const pendingCount = rows.filter((r) => r.status === "pending").reduce((s, r) => s + (r.count || 0), 0);
  const tiles = [
    { label: "Received", amount: sum(completed(false)), tone: "text-emerald-700" },
    { label: "Refunded & withdrawn", amount: sum(completed(true)), tone: "text-red-600" },
    { label: `Awaiting approval (${pendingCount})`, amount: sum((r) => r.status === "pending"), tone: "text-amber-700" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {tiles.map((t, i) => (
        <Card key={i} className="p-3">
          <p className="text-xs text-slate-500">{t.label}</p>
          <p className={`text-lg font-semibold ${t.tone}`}>{formatCurrency(t.amount)}</p>
        </Card>
      ))}
    </div>
  );
}