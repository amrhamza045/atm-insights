import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Loader, TrendingUp, AlertTriangle, CheckCircle2, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DraftPurchaseOrderCreator from '@/components/inventory/DraftPurchaseOrderCreator';
import { useBranch } from '@/components/branches/BranchContext';
import useBranchInventory from '@/components/inventory/useBranchInventory';

export default function InventoryForecastingTool() {
  // The branch picked in the header.
  const { selectedBranchId, selectedBranch } = useBranch();
  const [forecastDays, setForecastDays] = useState('30');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [safetyStockDays, setSafetyStockDays] = useState('14');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [forecastResults, setForecastResults] = useState(null);
  const [showPOCreator, setShowPOCreator] = useState(false);

  // Results belong to the branch they were generated for.
  useEffect(() => {
    setForecastResults(null);
    setShowPOCreator(false);
  }, [selectedBranchId]);

  const { data: inventoryItems = [] } = useBranchInventory();

  // This branch's orders from the last 90 days
  const { data: orders = [] } = useQuery({
    queryKey: ['orders-forecast', selectedBranchId],
    enabled: !!selectedBranchId,
    queryFn: () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      return base44.entities.Order.filter({ branch_id: selectedBranchId, created_date: { $gte: since.toISOString() } }, '-created_date', 5000);
    }
  });

  const analyzeForecast = async () => {
    if (!selectedBranchId) {
      toast.error('Please select a branch');
      return;
    }

    setIsAnalyzing(true);
    try {
      const daysBack = parseInt(forecastDays);
      const leadTime = parseInt(leadTimeDays);
      const safetyDays = parseInt(safetyStockDays);

      // Filter orders for selected branch
      const branchOrders = orders;

      // Calculate daily sales by item
      const itemSales = {};
      branchOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (item.menu_item_id) {
              if (!itemSales[item.menu_item_id]) {
                itemSales[item.menu_item_id] = { quantity: 0, name: item.name, sales: [] };
              }
              itemSales[item.menu_item_id].quantity += item.quantity || 0;
              itemSales[item.menu_item_id].sales.push({ qty: item.quantity, date: order.created_date });
            }
          });
        }
      });

      // Get branch inventory
      const branchInventory = inventoryItems;

      // Calculate recommendations
      const recommendations = [];
      const dailyAverage = daysBack / 30; // Normalize to 30 days

      Object.entries(itemSales).forEach(([itemId, salesData]) => {
        const avgDailySales = salesData.quantity / daysBack;
        const inventoryItem = branchInventory.find(inv => 
          inv.name && salesData.name && inv.name.toLowerCase().includes(salesData.name.toLowerCase())
        );

        const currentStock = inventoryItem?.current_stock || 0;
        const reorderPoint = avgDailySales * (leadTime + safetyDays);
        const optimalQuantity = avgDailySales * 30; // 30-day supply
        const recommendedQuantity = Math.max(0, optimalQuantity - currentStock);

        const status = currentStock <= reorderPoint ? 'critical' : 
                      currentStock <= (reorderPoint * 1.5) ? 'warning' : 'healthy';

        recommendations.push({
          itemName: salesData.name,
          currentStock,
          avgDailySales: parseFloat(avgDailySales.toFixed(2)),
          reorderPoint: parseFloat(reorderPoint.toFixed(2)),
          optimalQuantity: parseFloat(optimalQuantity.toFixed(0)),
          recommendedQuantity: parseFloat(recommendedQuantity.toFixed(0)),
          daysOfStock: currentStock > 0 ? parseFloat((currentStock / avgDailySales).toFixed(1)) : 0,
          status,
          totalSales: salesData.quantity
        });
      });

      // Sort by priority (critical first, then by reorder point)
      recommendations.sort((a, b) => {
        const statusOrder = { critical: 0, warning: 1, healthy: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return b.avgDailySales - a.avgDailySales;
      });

      setForecastResults({
        branchId: selectedBranchId,
        branchName: selectedBranch?.name,
        period: daysBack,
        leadTime,
        safetyDays,
        recommendations,
        generatedAt: new Date().toLocaleString()
      });
      toast.success('Forecast analysis complete!');
    } catch (err) {
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusColors = {
    critical: 'bg-red-50 border-red-200',
    warning: 'bg-warning-50 border-warning-200',
    healthy: 'bg-green-50 border-green-200'
  };

  const statusBadges = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-warning-100 text-warning-700',
    healthy: 'bg-green-100 text-green-700'
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Forecast Configuration
          </CardTitle>
          <CardDescription>
            Set up forecast parameters and analyze inventory needs for {selectedBranch?.name || "the branch picked at the top"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Historical Period (days)
              </label>
              <Select value={forecastDays} onValueChange={setForecastDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Supplier Lead Time (days)
              </label>
              <Select value={leadTimeDays} onValueChange={setLeadTimeDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Safety Stock (days)
              </label>
              <Select value={safetyStockDays} onValueChange={setSafetyStockDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="21">21 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={analyzeForecast}
            disabled={isAnalyzing || !selectedBranchId}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Generate Forecast
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Card */}
      {forecastResults && (
        <Card className="border-slate-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{forecastResults.branchName}</CardTitle>
                <CardDescription>
                  Generated {forecastResults.generatedAt} • {forecastResults.recommendations.length} items analyzed
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowPOCreator(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Create Draft POs
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">Critical Stock Items</p>
                <p className="text-2xl font-bold text-red-600">
                  {forecastResults.recommendations.filter(r => r.status === 'critical').length}
                </p>
              </div>
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                <p className="text-sm text-warning-700 font-medium">Items at Risk</p>
                <p className="text-2xl font-bold text-warning-600">
                  {forecastResults.recommendations.filter(r => r.status === 'warning').length}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">Healthy Stock</p>
                <p className="text-2xl font-bold text-green-600">
                  {forecastResults.recommendations.filter(r => r.status === 'healthy').length}
                </p>
              </div>
            </div>

            {/* Recommendations Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-2 font-semibold text-slate-900">Item</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-900">Current Stock</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-900">Avg Daily Sales</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-900">Days Supply</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-900">Reorder Point</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-900">Recommended Qty</th>
                    <th className="text-center px-4 py-2 font-semibold text-slate-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {forecastResults.recommendations.map((item, idx) => (
                    <tr key={idx} className={`border-l-4 ${statusColors[item.status]}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.itemName}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {parseFloat(item.currentStock).toFixed(0)} units
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {item.avgDailySales.toFixed(1)} units
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        <span className={item.daysOfStock <= forecastResults.leadTime ? 'text-red-600 font-semibold' : ''}>
                          {item.daysOfStock} days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {item.reorderPoint.toFixed(0)} units
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        <span className={item.recommendedQuantity > 0 ? 'text-blue-600' : 'text-green-600'}>
                          {item.recommendedQuantity.toFixed(0)} units
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusBadges[item.status]}`}>
                          {item.status === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {item.status === 'healthy' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900 mb-2">Forecast Parameters:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Historical Period:</strong> Last {forecastResults.period} days of sales data</li>
                <li>• <strong>Reorder Point:</strong> Avg daily sales × (Lead time + Safety stock)</li>
                <li>• <strong>Recommended Qty:</strong> Amount to order to maintain 30-day supply</li>
                <li>• <strong>Critical:</strong> Stock below reorder point</li>
                <li>• <strong>At Risk:</strong> Stock below 150% of reorder point</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draft PO Creator Modal */}
      {showPOCreator && (
        <DraftPurchaseOrderCreator
          forecastResults={forecastResults}
          onClose={() => setShowPOCreator(false)}
        />
      )}
    </div>
  );
}