import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, Download, TrendingUp, TrendingDown, PoundSterling } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { isOrderInSession } from "@/components/utils/timezoneHelper";

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function SessionReports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const { data: sessions = [] } = useQuery({
    queryKey: ["cashierSessions"],
    queryFn: () => base44.entities.CashierSession.list("-created_date")
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["allOrders"],
    queryFn: () => base44.entities.Order.list("-created_date")
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date")
  });

  const { data: allReturns = [] } = useQuery({
    queryKey: ["returns"],
    queryFn: () => base44.entities.Return.list("-return_date")
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list()
  });

  // Filter sessions by date range
  const filteredSessions = sessions.filter(s => {
    if (!startDate && !endDate) return s.status === "closed";
    const sessionDate = new Date(s.session_date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && sessionDate < start) return false;
    if (end && sessionDate > end) return false;
    return s.status === "closed";
  });

  // Selected session details
  const selectedSession = selectedSessionId ? sessions.find(s => s.id === selectedSessionId) : null;
  const sessionOrders = selectedSession ? allOrders.filter(o => 
    isOrderInSession(o.created_date, selectedSession.opening_time, selectedSession.closing_time)
  ) : [];
  const sessionExpenses = selectedSession ? allExpenses.filter(e => e.session_id === selectedSession.id && e.status === "approved") : [];
  const sessionReturns = selectedSession ? allReturns.filter(r => r.session_id === selectedSession.id) : [];

  // Aggregate data for charts
  const dailyIncomeData = filteredSessions.map(s => ({
    date: new Date(s.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    income: s.total_sales || 0,
    expenses: s.total_expenses || 0,
    net: (s.total_sales || 0) - (s.total_expenses || 0)
  }));

  const paymentMethodData = filteredSessions.reduce((acc, s) => {
    acc.cash += s.cash_sales || 0;
    acc.card += s.card_sales || 0;
    acc.wallet += s.wallet_sales || 0;
    acc.recharge += s.recharge_balance_sales || 0;
    return acc;
  }, { cash: 0, card: 0, wallet: 0, recharge: 0 });

  const paymentMethodChartData = [
    { name: 'Cash', value: paymentMethodData.cash },
    { name: 'Card', value: paymentMethodData.card },
    { name: 'Wallet', value: paymentMethodData.wallet },
    { name: 'Recharge', value: paymentMethodData.recharge }
  ].filter(d => d.value > 0);

  const expenseCategoryData = allExpenses
    .filter(e => {
      if (!selectedSessionId) {
        return filteredSessions.some(s => s.id === e.session_id) && e.status === "approved";
      }
      return e.session_id === selectedSessionId && e.status === "approved";
    })
    .reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
      return acc;
    }, {});

  const expenseCategoryChartData = Object.entries(expenseCategoryData).map(([category, amount]) => ({
    name: category.replace('_', ' ').toUpperCase(),
    value: amount
  }));

  // Order Items Analysis - grouped by preparation station and item
  const ordersToAnalyze = selectedSessionId ? sessionOrders : 
    allOrders.filter(o => filteredSessions.some(s => 
      isOrderInSession(o.created_date, s.opening_time, s.closing_time)
    ));

  const itemsByStation = ordersToAnalyze.reduce((acc, order) => {
    order.items?.forEach(item => {
      const menuItem = menuItems.find(m => m.id === item.menu_item_id);
      const station = menuItem?.preparation_station || 'kitchen';
      
      if (!acc[station]) {
        acc[station] = {};
      }
      
      if (!acc[station][item.name]) {
        acc[station][item.name] = 0;
      }
      
      acc[station][item.name] += item.quantity;
    });
    return acc;
  }, {});

  // Format for charts
  const kitchenItemsData = itemsByStation.kitchen ? 
    Object.entries(itemsByStation.kitchen)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) : [];

  const barItemsData = itemsByStation.bar ? 
    Object.entries(itemsByStation.bar)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) : [];

  const stationTotals = [
    { name: 'Kitchen', value: Object.values(itemsByStation.kitchen || {}).reduce((sum, count) => sum + count, 0) },
    { name: 'Bar', value: Object.values(itemsByStation.bar || {}).reduce((sum, count) => sum + count, 0) }
  ].filter(d => d.value > 0);

  // Summary stats
  const totalSales = filteredSessions.reduce((sum, s) => sum + (s.total_sales || 0), 0);
  const totalExpenses = filteredSessions.reduce((sum, s) => sum + (s.total_expenses || 0), 0);
  const totalReturns = filteredSessions.reduce((sum, s) => sum + (s.total_returns || 0), 0);
  const avgDailySales = filteredSessions.length > 0 ? totalSales / filteredSessions.length : 0;
  const netIncome = totalSales - totalExpenses - totalReturns;

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Specific Session</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Sessions</SelectItem>
                  {filteredSessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {new Date(s.session_date).toLocaleDateString()} - {s.cashier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setSelectedSessionId("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Returns</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalReturns)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Net Income</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(netIncome)}</p>
              </div>
              <PoundSterling className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Daily Sales</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(avgDailySales)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Income Chart */}
      {dailyIncomeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyIncomeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Sales" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                <Bar dataKey="net" fill="#3b82f6" name="Net Income" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        {paymentMethodChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Expense Categories */}
        {expenseCategoryChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseCategoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseCategoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Kitchen vs Bar Station Breakdown */}
      {stationTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kitchen vs Bar Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stationTotals}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#f59e0b" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Kitchen Items */}
      {kitchenItemsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Kitchen Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={kitchenItemsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#f59e0b" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Bar Items */}
      {barItemsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Bar Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barItemsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Session Report */}
      {selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Session Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600">Session Date</p>
                <p className="font-semibold">{new Date(selectedSession.session_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Cashier</p>
                <p className="font-semibold">{selectedSession.cashier_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Duration</p>
                <p className="font-semibold">
                  {Math.round((new Date(selectedSession.closing_time) - new Date(selectedSession.opening_time)) / 3600000)}h
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Cash Difference</p>
                <p className={`font-semibold ${selectedSession.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedSession.cash_difference >= 0 ? '+' : ''}{formatCurrency(selectedSession.cash_difference)}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-2">Sales Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Orders:</span>
                    <span className="font-semibold">{sessionOrders.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cash Sales:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(selectedSession.cash_sales || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Card Sales:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(selectedSession.card_sales || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Wallet Sales:</span>
                    <span className="font-semibold text-purple-600">{formatCurrency(selectedSession.wallet_sales || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Recharge Sales:</span>
                    <span className="font-semibold text-teal-600">{formatCurrency(selectedSession.recharge_balance_sales || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t font-bold">
                    <span>Total Sales:</span>
                    <span className="text-green-600">{formatCurrency(selectedSession.total_sales || 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Expenses</p>
                <div className="space-y-2">
                  {sessionExpenses.map(expense => (
                    <div key={expense.id} className="flex justify-between text-sm">
                      <span className="truncate">{expense.description}</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                  {sessionExpenses.length === 0 && (
                    <p className="text-sm text-slate-400">No expenses recorded</p>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t font-bold">
                    <span>Total Expenses:</span>
                    <span className="text-red-600">{formatCurrency(selectedSession.total_expenses || 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Returns & Delivery</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Returns:</span>
                    <span className="font-semibold text-orange-600">-{formatCurrency(selectedSession.total_returns || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Orders:</span>
                    <span className="font-semibold">{selectedSession.total_delivery_orders || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Cash:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(selectedSession.total_delivery_cash || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Credit:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(selectedSession.total_delivery_credit || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Commission:</span>
                    <span className="font-semibold text-amber-600">-{formatCurrency(selectedSession.total_delivery_commission || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Income Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-blue-700">Net Income (Sales - Expenses - Returns)</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">
                    {formatCurrency((selectedSession.total_sales || 0) - (selectedSession.total_expenses || 0) - (selectedSession.total_returns || 0))}
                  </p>
                </div>
                <PoundSterling className="w-12 h-12 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Comparison Table */}
      {filteredSessions.length > 0 && !selectedSessionId && (
        <Card>
          <CardHeader>
            <CardTitle>Session Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Cashier</th>
                    <th className="text-right p-2">Orders</th>
                    <th className="text-right p-2">Sales</th>
                    <th className="text-right p-2">Expenses</th>
                    <th className="text-right p-2">Returns</th>
                    <th className="text-right p-2">Net Income</th>
                    <th className="text-right p-2">Cash Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map(session => (
                    <tr key={session.id} className="border-b hover:bg-slate-50">
                      <td className="p-2">{new Date(session.session_date).toLocaleDateString()}</td>
                      <td className="p-2">{session.cashier_name}</td>
                      <td className="text-right p-2">{session.total_orders || 0}</td>
                      <td className="text-right p-2 text-green-600 font-semibold">{formatCurrency(session.total_sales || 0)}</td>
                      <td className="text-right p-2 text-red-600">{formatCurrency(session.total_expenses || 0)}</td>
                      <td className="text-right p-2 text-orange-600">{formatCurrency(session.total_returns || 0)}</td>
                      <td className="text-right p-2 text-blue-600 font-semibold">
                        {formatCurrency((session.total_sales || 0) - (session.total_expenses || 0) - (session.total_returns || 0))}
                      </td>
                      <td className={`text-right p-2 font-semibold ${session.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {session.cash_difference >= 0 ? '+' : ''}{formatCurrency(session.cash_difference)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}