import { useState, useMemo } from "react";
import { companyToday, companyDateOf } from "@/components/utils/timezoneHelper";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import useOpenTab from "@/hooks/useOpenTab";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

// Views; each can be closed in Admin › Modules, per role or per user.
const FB_VIEWS = [["sales", "Sales"], ["items", "Items"], ["costs", "Costs"], ["operations", "Operations"], ["pl", "P&L"]];
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import {
  TrendingUp, TrendingDown, PoundSterling, ShoppingCart, Package, Clock,
  ChefHat, AlertTriangle, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon
} from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";
import CategoryTreemap from "@/components/admin/CategoryTreemap";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, ComposedChart
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function FBAnalyticsDashboard() {
  const viewTab = useOpenTab("SalesFnb", FB_VIEWS.map(([key]) => key));
  const { selectedBranchId } = useBranch();
  const [dateRange, setDateRange] = useState({
    start: companyDateOf(Date.now() - 30 * 86400000),
    end: companyToday()
  });

  // Fetch all required data
  const { data: orders = [] } = useQuery({
    queryKey: ["fbOrders", dateRange],
    queryFn: () => base44.entities.Order.list("-created_date")
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["fbMenuItems"],
    queryFn: () => base44.entities.MenuItem.list()
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["fbInventory"],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["fbExpenses", dateRange],
    queryFn: () => base44.entities.Expense.list("-expense_date")
  });

  const { data: cashierPurchases = [] } = useQuery({
    queryKey: ["fbPurchases", dateRange],
    queryFn: () => base44.entities.CashierPurchase.list("-purchase_date")
  });

  // Filter orders by date range (include legacy data without branch_id)
  const filteredOrders = useMemo(() =>
    orders.filter(o => {
      if (!o.created_date || !['paid', 'completed'].includes(o.status)) return false;
      // Include if: no branch_id (legacy) OR branch_id matches selected OR no branch selected
      if (selectedBranchId && o.branch_id && o.branch_id !== selectedBranchId) return false;
      const orderDate = companyDateOf(o.created_date);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    }),
    [orders, dateRange, selectedBranchId]
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate COGS from purchases (include legacy data without branch_id)
    const totalCOGS = cashierPurchases
      .filter(p => {
        if (!p.purchase_date || p.status !== 'approved') return false;
        // Include if: no branch_id (legacy) OR branch_id matches selected OR no branch selected
        if (selectedBranchId && p.branch_id && p.branch_id !== selectedBranchId) return false;
        const date = companyDateOf(p.purchase_date);
        return date >= dateRange.start && date <= dateRange.end;
      })
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Calculate total expenses (include legacy data without branch_id)
    const totalExpenses = expenses
      .filter(e => {
        if (!e.expense_date || e.status !== 'approved') return false;
        // Include if: no branch_id (legacy) OR branch_id matches selected OR no branch selected
        if (selectedBranchId && e.branch_id && e.branch_id !== selectedBranchId) return false;
        const date = companyDateOf(e.expense_date);
        return date >= dateRange.start && date <= dateRange.end;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const netProfit = grossProfit - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalCOGS,
      grossProfit,
      grossMargin,
      totalExpenses,
      netProfit,
      netMargin
    };
  }, [filteredOrders, cashierPurchases, expenses, dateRange]);

  // Best-selling items analysis
  const bestSellingItems = useMemo(() => {
    const itemStats = {};
    
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        const key = item.menu_item_id || item.name;
        if (!itemStats[key]) {
          const menuItem = menuItems.find(m => m.id === item.menu_item_id);
          itemStats[key] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            cost: menuItem?.total_cost || 0,
            profit: 0,
            category: menuItem?.category || 'Unknown'
          };
        }
        itemStats[key].quantity += item.quantity || 1;
        const itemRevenue = (item.price || 0) * (item.quantity || 1);
        itemStats[key].revenue += itemRevenue;
        itemStats[key].profit += itemRevenue - (itemStats[key].cost * (item.quantity || 1));
      });
    });

    return Object.values(itemStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredOrders, menuItems]);

  // Peak hours analysis
  const peakHoursData = useMemo(() => {
    const hourlyStats = Array(24).fill(0).map((_, i) => ({ 
      hour: i, 
      orders: 0, 
      revenue: 0 
    }));

    filteredOrders.forEach(order => {
      if (!order.created_date) return;
      const hour = new Date(order.created_date).getHours();
      hourlyStats[hour].orders += 1;
      hourlyStats[hour].revenue += order.total || 0;
    });

    return hourlyStats
      .filter(h => h.orders > 0)
      .map(h => ({
        hour: `${h.hour}:00`,
        orders: h.orders,
        revenue: h.revenue
      }));
  }, [filteredOrders]);

  // Ingredient cost trends
  const ingredientCostTrends = useMemo(() => {
    const dailyCosts = {};

    cashierPurchases
      .filter(p => p.status === 'approved' && p.purchase_date && (!selectedBranchId || !p.branch_id || p.branch_id === selectedBranchId))
      .forEach(purchase => {
        const date = companyDateOf(purchase.purchase_date);
        if (date >= dateRange.start && date <= dateRange.end) {
          if (!dailyCosts[date]) {
            dailyCosts[date] = { date, total: 0 };
          }
          dailyCosts[date].total += purchase.total_amount || 0;
        }
      });

    return Object.values(dailyCosts).sort((a, b) => a.date.localeCompare(b.date));
  }, [cashierPurchases, dateRange]);

  // Food cost variance analysis
  const foodCostVariance = useMemo(() => {
    const dailyData = {};

    filteredOrders.forEach(order => {
      const date = companyDateOf(order.created_date);
      if (!dailyData[date]) {
        dailyData[date] = { date, revenue: 0, cost: 0 };
      }
      dailyData[date].revenue += order.total || 0;
      
      // Calculate theoretical cost based on menu item recipes
      order.items?.forEach(item => {
        const menuItem = menuItems.find(m => m.id === item.menu_item_id);
        if (menuItem?.total_cost) {
          dailyData[date].cost += menuItem.total_cost * (item.quantity || 1);
        }
      });
    });

    return Object.values(dailyData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        revenue: d.revenue,
        cost: d.cost,
        variance: d.revenue > 0 ? (d.cost / d.revenue) * 100 : 0
      }));
  }, [filteredOrders, menuItems]);

  // P&L performance over time
  const plPerformance = useMemo(() => {
    const dailyPL = {};

    filteredOrders.forEach(order => {
      const date = companyDateOf(order.created_date);
      if (!dailyPL[date]) {
        dailyPL[date] = { date, revenue: 0, cogs: 0, expenses: 0 };
      }
      dailyPL[date].revenue += order.total || 0;
      
      order.items?.forEach(item => {
        const menuItem = menuItems.find(m => m.id === item.menu_item_id);
        if (menuItem?.total_cost) {
          dailyPL[date].cogs += menuItem.total_cost * (item.quantity || 1);
        }
      });
    });

    expenses
      .filter(e => e.status === 'approved' && e.expense_date && (!selectedBranchId || !e.branch_id || e.branch_id === selectedBranchId))
      .forEach(expense => {
        const date = companyDateOf(expense.expense_date);
        if (date >= dateRange.start && date <= dateRange.end) {
          if (!dailyPL[date]) {
            dailyPL[date] = { date, revenue: 0, cogs: 0, expenses: 0 };
          }
          dailyPL[date].expenses += expense.amount || 0;
        }
      });

    return Object.values(dailyPL)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: d.date,
        revenue: d.revenue,
        grossProfit: d.revenue - d.cogs,
        netProfit: d.revenue - d.cogs - d.expenses
      }));
  }, [filteredOrders, menuItems, expenses, dateRange]);

  // Category performance
  const categoryPerformance = useMemo(() => {
    const categories = {};
    
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        const menuItem = menuItems.find(m => m.id === item.menu_item_id);
        const category = menuItem?.category || 'Uncategorized';
        
        if (!categories[category]) {
          categories[category] = { name: category, revenue: 0, quantity: 0 };
        }
        categories[category].revenue += (item.price || 0) * (item.quantity || 1);
        categories[category].quantity += item.quantity || 1;
      });
    });

    return Object.values(categories).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, menuItems]);

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>F&B Analytics Dashboard</CardTitle>
              <CardDescription>Comprehensive analysis of sales, costs, and profitability</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-40"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Row */}
      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{metrics.totalOrders} orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">COGS</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.totalCOGS)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.totalRevenue > 0 ? ((metrics.totalCOGS / metrics.totalRevenue) * 100).toFixed(1) : 0}% of revenue
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.grossProfit)}</p>
                <Badge className={metrics.grossMargin >= 60 ? "bg-green-600" : "bg-amber-600"}>
                  {metrics.grossMargin.toFixed(1)}% margin
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.netProfit)}
                </p>
                <Badge className={metrics.netMargin >= 0 ? "bg-green-600" : "bg-red-600"}>
                  {metrics.netMargin.toFixed(1)}% margin
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Operating Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.totalRevenue > 0 ? ((metrics.totalExpenses / metrics.totalRevenue) * 100).toFixed(1) : 0}% of revenue
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.avgOrderValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">per transaction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Analytics Views */}
      {!viewTab.value && <ClosedTabsNotice />}
      <Tabs value={viewTab.value || ""} onValueChange={viewTab.setValue} className={viewTab.value ? "space-y-4" : "hidden"}>
        <TabsList className="flex w-full">
          {FB_VIEWS.filter(([key]) => viewTab.isOpen(key)).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="flex-1">{label}</TabsTrigger>
          ))}
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Peak Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Peak Hours Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" fontSize={11} />
                    <YAxis yAxisId="left" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" fontSize={11} />
                    <Tooltip formatter={(value, name) => 
                      name === 'revenue' ? formatCurrency(value) : value
                    } />
                    <Legend />
                    <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="Orders" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Sales by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryTreemap data={categoryPerformance} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Best Sellers by Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top Items by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={bestSellingItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={120} fontSize={10} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Best Sellers by Profit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PoundSterling className="w-5 h-5" />
                  Top Items by Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={bestSellingItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={120} fontSize={10} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="profit" fill="#10b981" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Item Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Item Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Item</th>
                      <th className="text-right py-2 px-2">Qty Sold</th>
                      <th className="text-right py-2 px-2">Revenue</th>
                      <th className="text-right py-2 px-2">Cost/Unit</th>
                      <th className="text-right py-2 px-2">Profit</th>
                      <th className="text-right py-2 px-2">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestSellingItems.map((item, idx) => {
                      const margin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                      return (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-2 font-medium">{item.name}</td>
                          <td className="text-right py-2 px-2">{item.quantity}</td>
                          <td className="text-right py-2 px-2">{formatCurrency(item.revenue)}</td>
                          <td className="text-right py-2 px-2">{formatCurrency(item.cost)}</td>
                          <td className="text-right py-2 px-2 font-medium">{formatCurrency(item.profit)}</td>
                          <td className="text-right py-2 px-2">
                            <Badge className={margin >= 60 ? "bg-green-600" : margin >= 40 ? "bg-amber-600" : "bg-red-600"}>
                              {margin.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Ingredient Cost Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Ingredient Cost Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={ingredientCostTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="#fef3c7" name="Cost" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Food Cost Variance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Food Cost % Variance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={foodCostVariance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="variance" stroke="#ef4444" strokeWidth={2} name="Food Cost %" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Target:</strong> Food cost should be between 28-35% of revenue. 
                    Variance above 35% indicates potential waste or pricing issues.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total COGS</p>
                    <p className="text-xl font-bold">{formatCurrency(metrics.totalCOGS)}</p>
                  </div>
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Operating Expenses</p>
                    <p className="text-xl font-bold">{formatCurrency(metrics.totalExpenses)}</p>
                  </div>
                  <ChefHat className="w-6 h-6 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Food Cost %</p>
                    <p className="text-xl font-bold">
                      {metrics.totalRevenue > 0 ? ((metrics.totalCOGS / metrics.totalRevenue) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'COGS', value: metrics.totalCOGS },
                      { name: 'Operating Expenses', value: metrics.totalExpenses },
                      { name: 'Gross Profit', value: metrics.grossProfit }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* P&L Tab */}
        <TabsContent value="pl" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="w-5 h-5" />
                P&L Performance Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={plPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" name="Revenue" />
                  <Line type="monotone" dataKey="grossProfit" stroke="#10b981" strokeWidth={2} name="Gross Profit" />
                  <Line type="monotone" dataKey="netProfit" stroke="#8b5cf6" strokeWidth={2} name="Net Profit" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary P&L */}
          <Card>
            <CardHeader>
              <CardTitle>Period Summary P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Total Revenue</span>
                  <span className="text-lg font-bold">{formatCurrency(metrics.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b ml-4">
                  <span>Less: Cost of Goods Sold</span>
                  <span className="text-red-600">({formatCurrency(metrics.totalCOGS)})</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b bg-blue-50 px-2 rounded">
                  <span className="font-semibold">Gross Profit</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{formatCurrency(metrics.grossProfit)}</div>
                    <div className="text-xs text-muted-foreground">{metrics.grossMargin.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b ml-4">
                  <span>Less: Operating Expenses</span>
                  <span className="text-red-600">({formatCurrency(metrics.totalExpenses)})</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-purple-50 px-2 rounded">
                  <span className="font-semibold">Net Profit</span>
                  <div className="text-right">
                    <div className={`text-xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(metrics.netProfit)}
                    </div>
                    <div className="text-xs text-muted-foreground">{metrics.netMargin.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}