import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PoundSterling, Gift, TrendingUp } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AnalyticsDashboard() {
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["redemptions"],
    queryFn: () => base44.entities.Redemption.list("-created_date")
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date")
  });

  // Calculate key metrics
  const activeClients = clients.filter(c => c.status === "active").length;
  const totalCashbackEarned = clients.reduce((sum, c) => sum + (c.cashback_earned || 0), 0);
  const totalRedeemed = redemptions.filter(r => r.status === "used").length;
  const totalPurchases = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Redemption trends over time (last 12 months)
  const redemptionTrends = (() => {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      
      const monthRedemptions = redemptions.filter(r => {
        const rDate = new Date(r.created_date);
        return rDate.getMonth() === date.getMonth() && 
               rDate.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthName,
        count: monthRedemptions.length,
        cashback: monthRedemptions.reduce((sum, r) => sum + (r.cashback_spent || 0), 0)
      });
    }
    
    return months;
  })();

  // Purchase trends over time (last 12 months)
  const purchaseTrends = (() => {
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      
      const monthPurchases = purchases.filter(p => {
        const pDate = new Date(p.created_date);
        return pDate.getMonth() === date.getMonth() && 
               pDate.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthName,
        count: monthPurchases.length,
        revenue: monthPurchases.reduce((sum, p) => sum + (p.amount || 0), 0)
      });
    }
    
    return months;
  })();

  // Client status distribution
  const statusDistribution = [
    { name: "Active", value: clients.filter(c => c.status === "active").length, color: "#10b981" },
    { name: "Pending", value: clients.filter(c => c.status === "pending").length, color: "#f59e0b" },
    { name: "Inactive", value: clients.filter(c => c.status === "inactive").length, color: "#ef4444" }
  ].filter(item => item.value > 0);

  // Top referrers
  const topReferrers = clients
    .map(client => {
      const referralCount = clients.filter(c => c.referred_by === client.id).length;
      return { ...client, referralCount };
    })
    .filter(c => c.referralCount > 0)
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between rtl:flex-row-reverse rtl:justify-end rtl:gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Active Clients</p>
                <p className="text-3xl font-bold text-slate-900">{activeClients}</p>
                <p className="text-xs text-slate-400 mt-1">Total: {clients.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between rtl:flex-row-reverse rtl:justify-end rtl:gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Cashback</p>
                <p className="text-3xl font-bold text-emerald-600">£{totalCashbackEarned.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-1">Earned by clients</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <PoundSterling className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between rtl:flex-row-reverse rtl:justify-end rtl:gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Rewards Redeemed</p>
                <p className="text-3xl font-bold text-amber-600">{totalRedeemed}</p>
                <p className="text-xs text-slate-400 mt-1">Total redemptions</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Gift className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between rtl:flex-row-reverse rtl:justify-end rtl:gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-violet-600">£{totalPurchases.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-1">From purchases</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Redemption Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={redemptionTrends}>
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
                  dataKey="count" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Redemptions"
                  dot={{ fill: '#f59e0b', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Purchase Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={purchaseTrends}>
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
                  formatter={(value) => `£${value.toFixed(2)}`}
                />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  fill="#8b5cf6" 
                  name="Revenue"
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
            <CardTitle className="text-lg">Client Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topReferrers.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No referral data yet</p>
              ) : (
                topReferrers.map((client, index) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{client.referralCount}</p>
                      <p className="text-xs text-slate-500">referrals</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashback Spent Trend */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Cashback Spending Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={redemptionTrends}>
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
                formatter={(value) => `£${value.toFixed(2)}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cashback" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Cashback Spent"
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}