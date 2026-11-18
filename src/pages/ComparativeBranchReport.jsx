import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import useLaborCostTotals from '@/components/executive/useLaborCostTotals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { X } from 'lucide-react';

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ComparativeBranchReport() {
  const [selectedBranches, setSelectedBranches] = useState([]);

  // Fetch all branches
  const { data: branches = [] } = useQuery({
    queryKey: ['allBranches'],
    queryFn: () => base44.asServiceRole.entities.Branch.list('-created_date', 100)
  });

  // Fetch orders for comparison
  const { data: allOrders = [] } = useQuery({
    queryKey: ['ordersForComparison'],
    queryFn: () => base44.asServiceRole.entities.Order.list('-created_date', 500)
  });

  // Fetch salary records
  const { data: salaryRecords = [] } = useLaborCostTotals();

  // Fetch inventory data
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventoryItemsForComparison'],
    queryFn: () => base44.asServiceRole.entities.InventoryItem.list('-created_date', 500)
  });

  // Filter orders and aggregate by selected branches
  const orderComparison = useMemo(() => {
    if (selectedBranches.length === 0) return [];

    const aggregated = {};
    selectedBranches.forEach(branchId => {
      aggregated[branchId] = {
        branchId,
        branchName: branches.find(b => b.id === branchId)?.name || 'Unknown',
        totalSales: 0,
        orderCount: 0,
        avgOrderValue: 0,
        dineIn: 0,
        delivery: 0,
        takeaway: 0
      };
    });

    allOrders.forEach(order => {
      if (selectedBranches.includes(order.branch_id)) {
        const stats = aggregated[order.branch_id];
        if (order.status !== 'cancelled') {
          stats.totalSales += order.total || 0;
          stats.orderCount += 1;
          if (order.order_type === 'dine_in') stats.dineIn += 1;
          if (order.order_type === 'delivery') stats.delivery += 1;
          if (order.order_type === 'takeaway') stats.takeaway += 1;
        }
      }
    });

    return Object.values(aggregated).map(s => ({
      ...s,
      avgOrderValue: s.orderCount > 0 ? Math.round(s.totalSales / s.orderCount) : 0
    }));
  }, [selectedBranches, allOrders, branches]);

  // Aggregate labor costs by selected branches
  const laborComparison = useMemo(() => {
    if (selectedBranches.length === 0) return [];

    const aggregated = {};
    selectedBranches.forEach(branchId => {
      aggregated[branchId] = {
        branchId,
        branchName: branches.find(b => b.id === branchId)?.name || 'Unknown',
        totalGrossSalary: 0,
        totalNetSalary: 0,
        employeeCount: 0,
        totalOvertimeEarnings: 0
      };
    });

    salaryRecords.forEach(record => {
      if (selectedBranches.includes(record.branch_id)) {
        const stats = aggregated[record.branch_id];
        stats.totalGrossSalary += record.gross_salary || 0;
        stats.totalNetSalary += record.net_salary || 0;
        stats.totalOvertimeEarnings += record.overtime_earnings || 0;
      }
    });

    // Headcount per branch: the busiest month's headcount from the server totals
    selectedBranches.forEach(branchId => {
      aggregated[branchId].employeeCount = Math.max(0, ...salaryRecords
        .filter(r => r.branch_id === branchId)
        .map(r => r.headcount || 0));
    });

    return Object.values(aggregated);
  }, [selectedBranches, salaryRecords, branches]);

  // Inventory accuracy comparison
  const inventoryComparison = useMemo(() => {
    if (selectedBranches.length === 0) return [];

    const aggregated = {};
    selectedBranches.forEach(branchId => {
      aggregated[branchId] = {
        branchId,
        branchName: branches.find(b => b.id === branchId)?.name || 'Unknown',
        totalInventoryValue: 0,
        itemCount: 0,
        lowStockItems: 0
      };
    });

    inventoryItems.forEach(item => {
      if (selectedBranches.includes(item.branch_id)) {
        const stats = aggregated[item.branch_id];
        const itemValue = (item.current_stock || 0) * (item.cost_per_unit || 0);
        stats.totalInventoryValue += itemValue;
        stats.itemCount += 1;
        if ((item.current_stock || 0) <= (item.low_stock_level || 0)) {
          stats.lowStockItems += 1;
        }
      }
    });

    return Object.values(aggregated).map(s => ({
      ...s,
      stockHealthPercent: s.itemCount > 0 ? Math.round(((s.itemCount - s.lowStockItems) / s.itemCount) * 100) : 100
    }));
  }, [selectedBranches, inventoryItems, branches]);

  const toggleBranch = (branchId) => {
    if (selectedBranches.includes(branchId)) {
      setSelectedBranches(selectedBranches.filter(b => b !== branchId));
    } else {
      setSelectedBranches([...selectedBranches, branchId]);
    }
  };

  const clearSelection = () => {
    setSelectedBranches([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Comparative Branch Report</h1>
        <p className="text-slate-600">Compare performance across multiple branches side-by-side</p>
      </div>

      {/* Branch Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Branches to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {branches.map(branch => (
              <button
                key={branch.id}
                onClick={() => toggleBranch(branch.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedBranches.includes(branch.id)
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {branch.name}
              </button>
            ))}
          </div>
          {selectedBranches.length > 0 && (
            <Button variant="destructive" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
          )}
        </CardContent>
      </Card>

      {selectedBranches.length === 0 ? (
        <Card className="bg-slate-50 border-slate-300">
          <CardContent className="pt-6 text-center text-slate-600">
            Select at least one branch to view comparison charts
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Sales Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
              <CardDescription>Total sales and order metrics by branch</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={orderComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branchName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => `EGP ${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="totalSales" fill="#f59e0b" name="Total Sales (EGP)" />
                  <Bar dataKey="avgOrderValue" fill="#3b82f6" name="Avg Order Value (EGP)" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {orderComparison.map((data, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium">{data.branchName}</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{data.orderCount}</p>
                    <p className="text-xs text-slate-500">Orders</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Order Type Distribution</CardTitle>
              <CardDescription>Breakdown by dine-in, delivery, and takeaway</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {orderComparison.map((data, idx) => (
                  <div key={idx}>
                    <p className="text-sm font-semibold text-slate-700 text-center mb-4">{data.branchName}</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Dine In', value: data.dineIn },
                            { name: 'Delivery', value: data.delivery },
                            { name: 'Takeaway', value: data.takeaway }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {[0, 1, 2].map((i) => (
                            <Cell key={i} fill={CHART_COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Labor Cost Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Labor Cost Analysis</CardTitle>
              <CardDescription>Gross and net salary expenses by branch</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={laborComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branchName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => `EGP ${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="totalGrossSalary" fill="#10b981" name="Gross Salary (EGP)" />
                  <Bar dataKey="totalNetSalary" fill="#3b82f6" name="Net Salary (EGP)" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {laborComparison.map((data, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium">{data.branchName}</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{data.employeeCount}</p>
                    <p className="text-xs text-slate-500">Employees</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Accuracy */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Health</CardTitle>
              <CardDescription>Stock levels and inventory accuracy by branch</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="branchName" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalInventoryValue" fill="#8b5cf6" name="Inventory Value (EGP)" />
                  <Bar yAxisId="right" dataKey="stockHealthPercent" fill="#10b981" name="Stock Health (%)" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {inventoryComparison.map((data, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 font-medium">{data.branchName}</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{data.lowStockItems}</p>
                    <p className="text-xs text-slate-500">Low Stock Items</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}