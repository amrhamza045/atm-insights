import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, TrendingUp, Crown, Medal, Award } from "lucide-react";
import moment from "moment";

export default function TopReferrersDashboard() {
  const startOfMonth = moment().startOf("month").toISOString();
  const endOfMonth = moment().endOf("month").toISOString();

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["cashbackTransactions", "referral", startOfMonth],
    queryFn: () =>
      base44.entities.CashbackTransaction.filter({
        transaction_type: "referral_cashback",
        created_date: { $gte: startOfMonth, $lte: endOfMonth },
      }, "-created_date", 500),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const leaderboard = useMemo(() => {
    if (!transactions.length || !clients.length) return [];

    // Only transactions with a valid source_client_id
    const validTxs = transactions.filter(tx => tx.source_client_id);

    // Group by referrer
    const byReferrer = {};
    for (const tx of validTxs) {
      const rid = tx.source_client_id;
      if (!byReferrer[rid]) {
        byReferrer[rid] = { totalCashback: 0, referredIds: new Set() };
      }
      byReferrer[rid].totalCashback += tx.cashback_amount || tx.amount || 0;
      byReferrer[rid].referredIds.add(tx.client_id);
    }

    // Build client lookup
    const clientMap = {};
    for (const c of clients) {
      clientMap[c.id] = c;
    }

    // Build ranked list
    const ranked = Object.entries(byReferrer)
      .map(([referrerId, stats]) => {
        const referrer = clientMap[referrerId];
        return {
          id: referrerId,
          name: referrer?.name || "Unknown",
          referralCode: referrer?.referral_code,
          tierName: referrer?.current_tier_name || referrer?.loyalty_tier_name || "",
          newCustomers: stats.referredIds.size,
          totalCashback: stats.totalCashback,
        };
      })
      .sort((a, b) => b.newCustomers - a.newCustomers || b.totalCashback - a.totalCashback);

    return ranked;
  }, [transactions, clients]);

  const isLoading = txLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className="text-center py-12 text-slate-500">
        Loading top referrers this month...
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">No referral activity this month</h3>
          <p className="text-sm text-slate-500 mt-1">
            Referral cashback will appear here once referred customers make purchases
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount) => `${parseFloat(amount || 0).toFixed(2)} EGP`;

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const getRankInfo = (index) => {
    if (index === 0) return { icon: Crown, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", gradient: "from-amber-50 to-white" };
    if (index === 1) return { icon: Award, color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-200", gradient: "from-slate-50 to-white" };
    if (index === 2) return { icon: Medal, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", gradient: "from-orange-50 to-white" };
    return null;
  };

  const monthLabel = moment().format("MMMM YYYY");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Top Referrers — {monthLabel}</h2>
          <p className="text-sm text-slate-500">
            {leaderboard.length} referrers earned cashback from {leaderboard.reduce((sum, r) => sum + r.newCustomers, 0)} new customers this month
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <TrendingUp className="w-3 h-3" />
          {formatCurrency(leaderboard.reduce((sum, r) => sum + r.totalCashback, 0))} total
        </Badge>
      </div>

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((referrer, index) => {
            const rank = getRankInfo(index);
            const Icon = rank.icon;
            return (
              <Card key={referrer.id} className={`border-2 ${rank.border} bg-gradient-to-br ${rank.gradient} shadow-lg`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-full ${rank.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${rank.color}`} />
                    </div>
                    <Badge variant="outline" className="text-xs font-bold">#{index + 1}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{referrer.name}</CardTitle>
                  {referrer.tierName && <Badge className="w-fit text-xs">{referrer.tierName}</Badge>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">New Customers:</span>
                      <span className="font-semibold">{referrer.newCustomers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Earned:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(referrer.totalCashback)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rest of Rankings */}
      {rest.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">All Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rest.map((referrer, index) => (
                <div
                  key={referrer.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 text-center font-semibold text-slate-400 text-sm">
                    #{index + 4}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{referrer.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {referrer.tierName && (
                        <Badge variant="outline" className="text-xs">{referrer.tierName}</Badge>
                      )}
                      {referrer.referralCode && (
                        <span className="text-xs text-slate-400 truncate">Code: {referrer.referralCode}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm shrink-0">
                    <div className="text-center w-16">
                      <div className="flex items-center justify-center gap-1 text-slate-600">
                        <Users className="w-4 h-4" />
                        <span className="font-semibold">{referrer.newCustomers}</span>
                      </div>
                      <div className="text-xs text-slate-500">Customers</div>
                    </div>
                    <div className="text-center w-24">
                      <div className="font-semibold text-green-600">{formatCurrency(referrer.totalCashback)}</div>
                      <div className="text-xs text-slate-500">Earned</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}