import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";

const COLORS = ["#ea580c", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export default function DailySalesChart() {
  const [days, setDays] = useState(7);

  // Fetch all orders from the last N days
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["dailySalesData", days],
    queryFn: async () => {
      try {
        const allOrders = await base44.entities.Order.list("-created_date");
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return allOrders.filter(order => {
          const orderDate = new Date(order.created_date);
          return orderDate >= cutoffDate && order.status !== "cancelled";
        });
      } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
      }
    }
  });

  // Fetch all branches for legend
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list()
  });

  // Aggregate data by date and branch
  const chartData = useMemo(() => {
    const dataMap = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_date);
      const dateKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const branchName = order.branch_name || "Unnamed Branch";
      
      if (!dataMap[dateKey]) {
        dataMap[dateKey] = { date: dateKey, total: 0 };
      }
      
      if (!dataMap[dateKey][branchName]) {
        dataMap[dateKey][branchName] = 0;
      }
      
      const amount = order.total || 0;
      dataMap[dateKey][branchName] += amount;
      dataMap[dateKey].total += amount;
    });

    return Object.values(dataMap).sort((a, b) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      return aDate - bDate;
    });
  }, [orders]);

  // Get unique branches from data
  const branchesInData = useMemo(() => {
    const branchSet = new Set();
    chartData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== "date" && key !== "total") {
          branchSet.add(key);
        }
      });
    });
    return Array.from(branchSet).sort();
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            Daily Sales Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-slate-500">
            Loading sales data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSales = chartData.reduce((sum, day) => sum + (day.total || 0), 0);
  const averageDaily = chartData.length > 0 ? totalSales / chartData.length : 0;
  const maxDaily = chartData.length > 0 ? Math.max(...chartData.map(d => d.total || 0)) : 0;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Daily Sales Performance
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {totalSales.toLocaleString("en-US", { style: "currency", currency: "EGP" })} across {branchesInData.length} branch{branchesInData.length !== 1 ? "es" : ""} in the last {days} days
            </p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  days === d
                    ? "bg-amber-600 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg">
            <p className="text-sm text-slate-600">Total Sales</p>
            <p className="text-2xl font-bold text-amber-700">
              {(totalSales / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg">
            <p className="text-sm text-slate-600">Daily Average</p>
            <p className="text-2xl font-bold text-blue-700">
              {(averageDaily / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
            <p className="text-sm text-slate-600">Peak Day</p>
            <p className="text-2xl font-bold text-green-700">
              {(maxDaily / 1000).toFixed(1)}K
            </p>
          </div>
        </div>

        <Tabs defaultValue="line" className="w-full">
          <TabsList>
            <TabsTrigger value="line">Trend</TabsTrigger>
            <TabsTrigger value="bar">Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="line" className="mt-4">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0" }}
                  formatter={(value) => value.toLocaleString("en-US", { style: "currency", currency: "EGP" })}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#ea580c"
                  strokeWidth={3}
                  dot={{ fill: "#ea580c", r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Total Sales"
                />
                {branchesInData.map((branch, idx) => (
                  <Line
                    key={branch}
                    type="monotone"
                    dataKey={branch}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    opacity={0.6}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="bar" className="mt-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0" }}
                  formatter={(value) => value.toLocaleString("en-US", { style: "currency", currency: "EGP" })}
                />
                <Legend />
                {branchesInData.map((branch, idx) => (
                  <Bar
                    key={branch}
                    dataKey={branch}
                    fill={COLORS[idx % COLORS.length]}
                    name={branch}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}