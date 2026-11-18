import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, PoundSterling, TrendingUp, Zap } from "lucide-react";
import useReferralPurchaseStats from "@/components/client/useReferralPurchaseStats";

export default function ReferredClientAnalytics({ clientId, clients = [] }) {
  const { data: refStats } = useReferralPurchaseStats(clientId);

  const { data: redemptions = [] } = useQuery({
    queryKey: ["redemptions"],
    queryFn: () => base44.entities.Redemption.list("-created_date")
  });

  const myReferrals = useMemo(() => 
    clients.filter(c => c.referred_by === clientId),
    [clients, clientId]
  );

  const getAllNetworkClients = (parentId) => {
    const direct = clients.filter(c => c.referred_by === parentId);
    let network = [...direct];
    direct.forEach(ref => {
      network = [...network, ...getAllNetworkClients(ref.id)];
    });
    return network;
  };

  const allNetworkClients = useMemo(() => 
    getAllNetworkClients(clientId),
    [clientId, clients]
  );

  // Analytics for referred clients
  const referralAnalytics = useMemo(() => {
    return myReferrals.map(ref => {
      const s = refStats?.referrals?.[ref.id] || {};
      const totalSpent = s.total_spent || 0;
      const totalCashbackGenerated = s.cashback_generated || 0;
      const purchaseCount = s.purchase_count || 0;

      return {
        id: ref.id,
        name: ref.name,
        email: ref.email,
        totalSpent,
        totalCashbackGenerated,
        purchaseCount,
        status: ref.status,
        cashbackBalance: ref.cashback_earned || 0
      };
    });
  }, [myReferrals, refStats]);

  // Top performers
  const topPerformers = useMemo(() => 
    [...referralAnalytics].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5),
    [referralAnalytics]
  );

  // Spending distribution
  const spendingDistribution = useMemo(() => {
    const ranges = {
      "£0-500": { min: 0, max: 500, count: 0 },
      "£500-1000": { min: 500, max: 1000, count: 0 },
      "£1000-2000": { min: 1000, max: 2000, count: 0 },
      "£2000+": { min: 2000, max: Infinity, count: 0 }
    };

    referralAnalytics.forEach(ref => {
      Object.entries(ranges).forEach(([key, range]) => {
        if (ref.totalSpent >= range.min && ref.totalSpent < range.max) {
          ranges[key].count++;
        }
      });
    });

    return Object.entries(ranges).map(([name, data]) => ({
      name,
      value: data.count
    }));
  }, [referralAnalytics]);

  // Summary stats
  const stats = useMemo(() => ({
    totalReferrals: myReferrals.length,
    totalNetworkSize: allNetworkClients.length,
    totalSpending: referralAnalytics.reduce((sum, r) => sum + r.totalSpent, 0),
    totalCashbackGenerated: referralAnalytics.reduce((sum, r) => sum + r.totalCashbackGenerated, 0),
    avgSpendingPerReferral: referralAnalytics.length > 0 ? 
      referralAnalytics.reduce((sum, r) => sum + r.totalSpent, 0) / referralAnalytics.length : 0,
    activeReferrals: referralAnalytics.filter(r => r.status === "active").length
  }), [referralAnalytics, myReferrals, allNetworkClients]);

  const COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6'];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Direct Referrals
            </CardTitle>
            <Users className="w-4 h-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalReferrals}</div>
            <p className="text-xs text-slate-500 mt-1">{stats.activeReferrals} active</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Network
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.totalNetworkSize}</div>
            <p className="text-xs text-slate-500 mt-1">All levels</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Network Spending
            </CardTitle>
            <PoundSterling className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">£{stats.totalSpending.toFixed(0)}</div>
            <p className="text-xs text-slate-500 mt-1">Total network purchases</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Cashback Generated
            </CardTitle>
            <Zap className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">£{stats.totalCashbackGenerated.toFixed(0)}</div>
            <p className="text-xs text-slate-500 mt-1">From referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Top Referrals by Spending</CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-500">
                No referral data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPerformers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value.toFixed(0)}`} />
                  <Bar dataKey="totalSpent" fill="#f59e0b" name="Total Spent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Spending Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Referral Spending Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingDistribution.every(d => d.value === 0) ? (
              <div className="h-48 flex items-center justify-center text-slate-500">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={spendingDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {spendingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referral Details Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Referral Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          {referralAnalytics.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No referrals yet. Share your code to start earning!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">Purchases</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">Total Spent</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">Cashback Generated</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-900">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {referralAnalytics.map(ref => (
                    <tr key={ref.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{ref.name}</p>
                          <p className="text-xs text-slate-500">{ref.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ref.status === "active" ? "default" : "secondary"}>
                          {ref.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900">{ref.purchaseCount}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        £{ref.totalSpent.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        £{ref.totalCashbackGenerated.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        £{ref.cashbackBalance.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}