import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Loader2 } from "lucide-react";
import { referrerKeyOf } from "./referrerKey";
import CommissionTotalsTable from "./CommissionTotalsTable";

// Totals per referrer, summed on the server: everything recorded, and what is already paid.
async function loadTotals() {
  const [all, paid] = await Promise.all([
    base44.entities.ReferralCommission.aggregate({ groupBy: "referrer_key", sum: ["amount"] }),
    base44.entities.ReferralCommission.aggregate({ query: { status: "paid" }, groupBy: "referrer_key", sum: ["amount"] }),
  ]);
  const paidBy = Object.fromEntries((paid.rows || []).map((r) => [r.referrer_key, r.sum_amount || 0]));
  return (all.rows || [])
    .map((r) => ({ key: r.referrer_key, events: r.count || 0, total: r.sum_amount || 0, paid: paidBy[r.referrer_key] || 0 }))
    .sort((a, b) => (b.total - b.paid) - (a.total - a.paid));
}

export default function ReferrerCommissionTotals({ referrals }) {
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["referral-commission-totals"], queryFn: loadTotals });
  const who = useMemo(() => Object.fromEntries(referrals.map((r) => [referrerKeyOf(r), r])), [referrals]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="w-4 h-4 text-amber-600" /> Commission per referrer
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No commissions recorded yet. Mark a referral as converted to record the referrer's commission.
          </p>
        ) : (
          <CommissionTotalsTable rows={rows} who={who} />
        )}
      </CardContent>
    </Card>
  );
}