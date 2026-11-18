import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useReferralPurchaseStats from "@/components/client/useReferralPurchaseStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PoundSterling, Gift, TrendingUp, Calendar, ShoppingBag } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from "recharts";

export default function ClientAnalyticsDashboard({ clientId, clientRecord, systemSettings }) {
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["myRedemptions", clientId],
    queryFn: async () => {
      const allRedemptions = await base44.entities.Redemption.list("-created_date");
      return allRedemptions.filter(r => r.client_id === clientId);
    },
    enabled: !!clientId
  });

  // Own purchases only; referral figures come pre-computed from the server.
  const { data: ownPurchases = [] } = useQuery({
    queryKey: ["ownPurchases", clientId],
    queryFn: () => base44.entities.Purchase.filter({ client_id: clientId }, "-created_date"),
    enabled: !!clientId
  });
  const { data: refStats } = useReferralPurchaseStats(clientId);
  const referralCashback = refStats?.referral_cashback || [];

  // Get direct referrals
  const myReferrals = useMemo(() => 
    clients.filter(c => c.referred_by === clientId),
    [clients, clientId]
  );

  // Calculate total network size
  const getTotalNetwork = (cId) => {
    let total = 0;
    const direct = clients.filter(c => c.referred_by === cId);
    total += direct.length;
    direct.forEach(ref => {
      total += getTotalNetwork(ref.id);
    });
    return total;
  };

  const totalNetwork = clientId ? getTotalNetwork(clientId) : 0;

  // Referral growth over time (last 12 months)
  const referralGrowth = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('en-US', { month: 'short' });
      
      const monthReferrals = myReferrals.filter(r => {
        const rDate = new Date(r.created_date);
        return rDate.getMonth() === date.getMonth() && 
               rDate.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthName,
        referrals: monthReferrals.length
      });
    }
    
    return months;
  }, [myReferrals]);

  // Cashback earned over time
  const cashbackHistory = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('en-US', { month: 'short' });
      
      const monthPurchases = referralCashback.filter(p => {
        const pDate = new Date(p.created_date);
        return pDate.getMonth() === date.getMonth() && 
               pDate.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthName,
        cashback: monthPurchases.reduce((sum, p) => sum + (p.cashback_earned || 0), 0)
      });
    }
    
    return months;
  }, [referralCashback]);

  // Redemption stats
  const redemptionStats = useMemo(() => {
    const used = redemptions.filter(r => r.status === "used").length;
    const pending = redemptions.filter(r => r.status === "pending").length;
    const rejected = redemptions.filter(r => r.status === "rejected").length;
    
    return [
      { name: "Used", value: used, color: "#10b981" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Rejected", value: rejected, color: "#ef4444" }
    ].filter(item => item.value > 0);
  }, [redemptions]);

  // Top referrals by activity
  const topReferrals = useMemo(() => {
    return myReferrals
      .map(ref => {
        const s = refStats?.referrals?.[ref.id] || {};
        return { ...ref, totalSpent: s.total_spent || 0, purchaseCount: s.purchase_count || 0 };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [myReferrals, refStats]);

  // My purchases (where I'm the buyer)
  const myPurchases = ownPurchases;

  // Average purchase value over time
  const avgPurchaseOverTime = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('en-US', { month: 'short' });
      
      const monthPurchases = myPurchases.filter(p => {
        const pDate = new Date(p.created_date);
        return pDate.getMonth() === date.getMonth() && 
               pDate.getFullYear() === date.getFullYear();
      });

      const avgValue = monthPurchases.length > 0
        ? monthPurchases.reduce((sum, p) => sum + (p.amount || 0), 0) / monthPurchases.length
        : 0;

      months.push({
        month: monthName,
        avgValue: avgValue,
        count: monthPurchases.length
      });
    }
    
    return months;
  }, [myPurchases]);

  // Purchase amount distribution
  const purchaseDistribution = useMemo(() => {
    const ranges = [
      { name: '£0-£50', min: 0, max: 50, count: 0 },
      { name: '£51-£100', min: 51, max: 100, count: 0 },
      { name: '£101-£200', min: 101, max: 200, count: 0 },
      { name: '£201-£500', min: 201, max: 500, count: 0 },
      { name: '£500+', min: 501, max: Infinity, count: 0 }
    ];

    myPurchases.forEach(p => {
      const amount = p.amount || 0;
      const range = ranges.find(r => amount >= r.min && amount <= r.max);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0);
  }, [myPurchases]);

  // Cashback vs Purchase Frequency correlation
  const cashbackFrequencyCorrelation = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('en-US', { month: 'short' });
      
      const monthPurchasesAsBuyer = myPurchases.filter(p => {
        const pDate = new Date(p.created_date);
        return pDate.getMonth() === date.getMonth() && 
               pDate.getFullYear() === date.getFullYear();
      });

      const monthCashbackEarned = referralCashback.filter(p => {
        const pDate = new Date(p.created_date);
        return pDate.getMonth() === date.getMonth() && 
               pDate.getFullYear() === date.getFullYear();
      }).reduce((sum, p) => sum + (p.cashback_earned || 0), 0);

      months.push({
        month: monthName,
        cashback: monthCashbackEarned,
        purchases: monthPurchasesAsBuyer.length
      });
    }
    
    return months.filter(m => m.purchases > 0 || m.cashback > 0);
  }, [myPurchases, referralCashback]);

  const totalCashbackEarned = clientRecord?.cashback_earned || 0;
  const totalRedeemed = redemptions.filter(r => r.status === "used").length;
  const totalCashbackSpent = redemptions
    .filter(r => r.status === "used")
    .reduce((sum, r) => sum + (r.cashback_spent || 0), 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Direct Referrals</p>
                <p className="text-3xl font-bold text-slate-900">{myReferrals.length}</p>
                <p className="text-xs text-slate-400 mt-1">Total network: {totalNetwork}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Cashback Balance</p>
                <p className="text-3xl font-bold text-emerald-600">{totalCashbackEarned.toFixed(2)} EGP</p>
                <p className="text-xs text-slate-400 mt-1">For rewards</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <PoundSterling className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Available Payout</p>
                <p className="text-3xl font-bold text-blue-600">{(clientRecord?.available_payout || 0).toFixed(2)} EGP</p>
                <p className="text-xs text-slate-400 mt-1">Ready to withdraw</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Payout Earned</p>
                <p className="text-3xl font-bold text-amber-600">{(clientRecord?.total_payout || 0).toFixed(2)} EGP</p>
                <p className="text-xs text-slate-400 mt-1">Lifetime earnings</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Gift className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Referral Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={referralGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="referrals" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="New Referrals"
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Cashback Earned Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashbackHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  stroke="#94a3b8"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `${value.toFixed(2)} EGP`}
                />
                <Legend />
                <Bar 
                  dataKey="cashback" 
                  fill="#10b981" 
                  name="Cashback"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Redemption Status</CardTitle>
          </CardHeader>
          <CardContent>
            {redemptionStats.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No redemptions yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={redemptionStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {redemptionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topReferrals.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No referral data yet</p>
              ) : (
                topReferrals.map((ref, index) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{ref.name}</p>
                        <p className="text-xs text-slate-500">{ref.purchaseCount} purchases</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">£{ref.totalSpent.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">total spent</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Behavior Section */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          My Purchase Behavior
        </h3>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Average Purchase Value Over Time */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Average Purchase Value</CardTitle>
            </CardHeader>
            <CardContent>
              {myPurchases.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  No purchase data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={avgPurchaseOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => {
                        if (name === "avgValue") return [`£${value.toFixed(2)}`, "Avg Value"];
                        return [value, "Purchases"];
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avgValue" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Avg Value"
                      dot={{ fill: '#3b82f6', r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      name="Purchases"
                      dot={{ fill: '#94a3b8', r: 4 }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Purchase Amount Distribution */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Purchase Amount Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseDistribution.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  No purchase data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={purchaseDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      stroke="#94a3b8"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="count" 
                      fill="#f59e0b" 
                      name="Purchases"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Cashback Earned vs Purchase Frequency */}
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Cashback Earned vs My Purchase Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {cashbackFrequencyCorrelation.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  No data to display
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashbackFrequencyCorrelation}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      stroke="#94a3b8"
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }} 
                      stroke="#94a3b8"
                      label={{ value: 'Cashback (£)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }} 
                      stroke="#94a3b8"
                      label={{ value: 'My Purchases', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => {
                        if (name === "Cashback Earned") return [`£${value.toFixed(2)}`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="cashback" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Cashback Earned"
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="purchases" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="My Purchases"
                      dot={{ fill: '#8b5cf6', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}