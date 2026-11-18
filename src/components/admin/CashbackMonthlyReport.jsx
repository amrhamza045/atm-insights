import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Wallet, PiggyBank, Calendar } from "lucide-react";
import moment from "moment";

export default function CashbackMonthlyReport() {
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["cashbackTransactions", "all"],
    queryFn: () => base44.entities.CashbackTransaction.list("-created_date", 1000),
  });

  const { data: payouts = [], isLoading: payoutLoading } = useQuery({
    queryKey: ["payouts", "all"],
    queryFn: () => base44.entities.Payout.list("-created_date", 1000),
  });

  const monthlyData = useMemo(() => {
    if (!transactions.length) return [];

    // Cashback generated: welcome + referral + self
    const earningTypes = ["welcome_cashback", "referral_cashback", "self_cashback"];
    const generatedTxs = transactions.filter(tx => earningTypes.includes(tx.transaction_type));

    // Cashback paid out: completed payouts
    const completedPayouts = payouts.filter(p => p.status === "completed");

    // Group by month
    const months = {};

    for (const tx of generatedTxs) {
      const monthKey = moment(tx.created_date).format("YYYY-MM");
      if (!months[monthKey]) months[monthKey] = { generated: 0, paidOut: 0 };
      months[monthKey].generated += tx.cashback_amount || 0;
    }

    for (const p of completedPayouts) {
      const monthKey = moment(p.created_date).format("YYYY-MM");
      if (!months[monthKey]) months[monthKey] = { generated: 0, paidOut: 0 };
      months[monthKey].paidOut += p.amount || 0;
    }

    // Convert to sorted array
    return Object.entries(months)
      .map(([month, data]) => ({
        month,
        label: moment(month, "YYYY-MM").format("MMMM YYYY"),
        generated: data.generated,
        paidOut: data.paidOut,
        net: data.generated - data.paidOut,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions, payouts]);

  const isLoading = txLoading || payoutLoading;

  const totals = useMemo(() => {
    if (!monthlyData.length) return { generated: 0, paidOut: 0, net: 0 };
    return {
      generated: monthlyData.reduce((s, m) => s + m.generated, 0),
      paidOut: monthlyData.reduce((s, m) => s + m.paidOut, 0),
      net: monthlyData.reduce((s, m) => s + m.net, 0),
    };
  }, [monthlyData]);

  const formatCurrency = (amount) => `${parseFloat(amount || 0).toFixed(2)} EGP`;

  if (isLoading) {
    return (
      <div className="text-center py-12 text-slate-500">
        Loading cashback report...
      </div>
    );
  }

  if (monthlyData.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">No cashback activity yet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Monthly breakdown will appear once cashback transactions are recorded
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">GenMo Cashback Report</h2>
        <p className="text-sm text-slate-500">Monthly breakdown of cashback generated and paid out</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-emerald-700">
              <PiggyBank className="w-5 h-5" />
              <CardTitle className="text-sm font-medium">Total Generated</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totals.generated)}</div>
            <p className="text-xs text-slate-500 mt-1">Welcome, referral & self cashback</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-red-700">
              <Wallet className="w-5 h-5" />
              <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totals.paidOut)}</div>
            <p className="text-xs text-slate-500 mt-1">Completed client payouts</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-blue-700">
              <BarChart3 className="w-5 h-5" />
              <CardTitle className="text-sm font-medium">Net Retained</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.net >= 0 ? "text-blue-700" : "text-red-700"}`}>
              {formatCurrency(totals.net)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Generated minus paid out</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              Monthly Breakdown
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {monthlyData.length} months
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Month</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Generated</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Paid Out</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => (
                  <tr key={row.month} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{row.label}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-emerald-600 font-medium">{formatCurrency(row.generated)}</span>
                      {row.generated === 0 && row.paidOut > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs text-slate-400">—</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-red-600 font-medium">{formatCurrency(row.paidOut)}</span>
                      {row.paidOut === 0 && row.generated > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs text-slate-400">—</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${row.net >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {row.net >= 0 ? "+" : ""}{formatCurrency(row.net)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-3 px-4 text-slate-900">Total</td>
                  <td className="py-3 px-4 text-right text-emerald-700">{formatCurrency(totals.generated)}</td>
                  <td className="py-3 px-4 text-right text-red-700">{formatCurrency(totals.paidOut)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={totals.net >= 0 ? "text-blue-700" : "text-red-700"}>
                      {totals.net >= 0 ? "+" : ""}{formatCurrency(totals.net)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}