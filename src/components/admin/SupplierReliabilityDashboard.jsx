import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, PoundSterling, Box } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";

export default function SupplierReliabilityDashboard() {
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [daysRange, setDaysRange] = useState("90");
  const { selectedBranchId } = useBranch();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("name")
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.PurchaseOrder.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        500
      );
      return all.filter(po => !selectedBranchId || po.branch_id === selectedBranchId);
    }
  });

  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ["purchaseInvoices", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.PurchaseInvoice.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        500
      );
      return all.filter(inv => inv.branch_id && (!selectedBranchId || inv.branch_id === selectedBranchId));
    }
  });

  const cutoffDate = useMemo(() => {
    const days = parseInt(daysRange);
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }, [daysRange]);

  const metrics = useMemo(() => {
    const allMetrics = {};

    suppliers.forEach(supplier => {
      // Filter orders and invoices for this supplier within date range
      const supplierOrders = purchaseOrders.filter(
        o => o.supplier_id === supplier.id && new Date(o.order_date) >= cutoffDate
      );

      const supplierInvoices = purchaseInvoices.filter(
        i => i.supplier_id === supplier.id && new Date(i.invoice_date) >= cutoffDate
      );

      // === DELIVERY PERFORMANCE ===
      let onTimeCount = 0;
      let lateCount = 0;
      const deliveryDays = [];

      supplierOrders.forEach(order => {
        if (order.status === "delivered" && order.expected_delivery_date) {
          const expectedDate = new Date(order.expected_delivery_date);
          const actualDate = order.actual_delivery_date ? new Date(order.actual_delivery_date) : new Date(order.updated_date);
          const daysLate = Math.floor((actualDate - expectedDate) / (1000 * 60 * 60 * 24));
          
          deliveryDays.push(daysLate);
          
          if (daysLate <= 0) {
            onTimeCount++;
          } else {
            lateCount++;
          }
        }
      });

      const totalDeliveries = onTimeCount + lateCount;
      const onTimePercentage = totalDeliveries > 0 ? (onTimeCount / totalDeliveries * 100).toFixed(1) : 0;
      const avgDeliveryVariance = deliveryDays.length > 0 ? (deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length).toFixed(1) : 0;

      // === PRICE FLUCTUATIONS ===
      const priceHistory = {};
      const priceTimeline = [];

      supplierInvoices.forEach(invoice => {
        invoice.items?.forEach(item => {
          if (!priceHistory[item.inventory_item_id]) {
            priceHistory[item.inventory_item_id] = [];
          }
          priceHistory[item.inventory_item_id].push({
            date: new Date(invoice.invoice_date),
            price: item.purchase_price,
            itemName: item.inventory_item_name
          });
        });
      });

      let totalPriceVariance = 0;
      let itemsWithPriceData = 0;

      Object.entries(priceHistory).forEach(([itemId, prices]) => {
        if (prices.length > 1) {
          const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
          const variance = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p.price - avgPrice, 2), 0) / prices.length);
          const variancePercent = (variance / avgPrice * 100).toFixed(2);
          totalPriceVariance += parseFloat(variancePercent);
          itemsWithPriceData++;
          
          // Add to timeline
          prices.forEach(p => {
            priceTimeline.push({
              date: p.date.toLocaleDateString(),
              [p.itemName]: p.price
            });
          });
        }
      });

      const avgPriceVariance = itemsWithPriceData > 0 ? (totalPriceVariance / itemsWithPriceData).toFixed(2) : 0;

      // === ITEM INCONSISTENCIES ===
      const inconsistencies = [];
      
      supplierInvoices.forEach(invoice => {
        invoice.items?.forEach((invoiceItem, idx) => {
          const correspondingOrder = supplierOrders.find(o => 
            o.items?.some(oi => oi.inventory_item_id === invoiceItem.inventory_item_id)
          );

          if (correspondingOrder) {
            const orderedItem = correspondingOrder.items?.find(oi => oi.inventory_item_id === invoiceItem.inventory_item_id);
            
            // Check for quantity mismatches, price changes, etc
            if (orderedItem) {
              if (Math.abs(orderedItem.quantity_ordered - invoiceItem.quantity) > 0.01) {
                inconsistencies.push({
                  type: "quantity_mismatch",
                  item: invoiceItem.inventory_item_name,
                  expected: orderedItem.quantity_ordered,
                  actual: invoiceItem.quantity,
                  date: invoice.invoice_date
                });
              }

              if (Math.abs(orderedItem.unit_price - invoiceItem.purchase_price) > 0.01) {
                inconsistencies.push({
                  type: "price_variance",
                  item: invoiceItem.inventory_item_name,
                  expected: orderedItem.unit_price,
                  actual: invoiceItem.purchase_price,
                  date: invoice.invoice_date
                });
              }
            }
          }
        });
      });

      const inconsistencyRate = supplierInvoices.length > 0 ? (inconsistencies.length / supplierInvoices.length * 100).toFixed(1) : 0;

      allMetrics[supplier.id] = {
        supplier,
        onTimePercentage: parseFloat(onTimePercentage),
        avgDeliveryVariance: parseFloat(avgDeliveryVariance),
        totalDeliveries,
        avgPriceVariance: parseFloat(avgPriceVariance),
        inconsistencyRate: parseFloat(inconsistencyRate),
        inconsistenciesCount: inconsistencies.length,
        invoiceCount: supplierInvoices.length,
        inconsistencies: inconsistencies.slice(0, 10) // Last 10
      };
    });

    return allMetrics;
  }, [suppliers, purchaseOrders, purchaseInvoices, cutoffDate]);

  const selectedSupplierMetrics = selectedSupplierId ? metrics[selectedSupplierId] : null;

  const reliabilityScore = (supplier) => {
    const deliveryScore = supplier.onTimePercentage;
    const priceStabilityScore = 100 - Math.min(supplier.avgPriceVariance * 5, 100);
    const consistencyScore = 100 - Math.min(supplier.inconsistencyRate * 2, 100);
    return ((deliveryScore * 0.4 + priceStabilityScore * 0.35 + consistencyScore * 0.25) / 100).toFixed(2);
  };

  const getScoreColor = (score) => {
    score = parseFloat(score);
    if (score >= 0.85) return "bg-green-100 text-green-700 border-green-300";
    if (score >= 0.70) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  const getScoreLabel = (score) => {
    score = parseFloat(score);
    if (score >= 0.85) return "Excellent";
    if (score >= 0.70) return "Good";
    return "Needs Improvement";
  };

  return (
    <div className="space-y-4">
      {/* Supplier Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Select Supplier
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(sup => (
                <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={daysRange} onValueChange={setDaysRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary Cards - All Suppliers */}
      {!selectedSupplierId ? (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map(supplier => {
              const metric = metrics[supplier.id];
              if (!metric) return null;
              const score = reliabilityScore(metric);

              return (
                <Card key={supplier.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSupplierId(supplier.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{supplier.name}</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">Click to view details</p>
                      </div>
                      <Badge className={`border ${getScoreColor(score)}`}>
                        {score}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-slate-600">On-Time Deliveries</span>
                      </div>
                      <span className="font-semibold text-sm">{metric.onTimePercentage}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PoundSterling className="w-4 h-4 text-amber-600" />
                        <span className="text-xs text-slate-600">Price Variance</span>
                      </div>
                      <span className="font-semibold text-sm">{metric.avgPriceVariance}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-orange-600" />
                        <span className="text-xs text-slate-600">Inconsistency Rate</span>
                      </div>
                      <span className="font-semibold text-sm">{metric.inconsistencyRate}%</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : selectedSupplierMetrics ? (
        <>
          {/* Detailed Metrics Header */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Reliability Score</p>
                    <p className="text-3xl font-bold mt-2">{reliabilityScore(selectedSupplierMetrics)}</p>
                    <p className="text-xs text-slate-600 mt-1">{getScoreLabel(reliabilityScore(selectedSupplierMetrics))}</p>
                  </div>
                  <Badge className={`border text-lg px-3 py-1 ${getScoreColor(reliabilityScore(selectedSupplierMetrics))}`}>
                    {reliabilityScore(selectedSupplierMetrics)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Delivery Performance</p>
                  <div className="mt-2">
                    <p className="text-3xl font-bold text-green-600">{selectedSupplierMetrics.onTimePercentage}%</p>
                    <p className="text-xs text-slate-600 mt-1">{selectedSupplierMetrics.totalDeliveries} deliveries</p>
                    {selectedSupplierMetrics.avgDeliveryVariance !== 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Avg {selectedSupplierMetrics.avgDeliveryVariance > 0 ? '↓' : '↑'} {Math.abs(selectedSupplierMetrics.avgDeliveryVariance)} days
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Price Stability & Consistency</p>
                  <div className="mt-2 space-y-1">
                    <div>
                      <p className="text-sm text-slate-600">Price Variance</p>
                      <p className="text-lg font-bold text-warning-600">{selectedSupplierMetrics.avgPriceVariance}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Inconsistencies</p>
                      <p className="text-lg font-bold text-orange-600">{selectedSupplierMetrics.inconsistencyRate}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Inconsistencies */}
          {selectedSupplierMetrics.inconsistencies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  Recent Inconsistencies ({selectedSupplierMetrics.inconsistenciesCount} total)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedSupplierMetrics.inconsistencies.map((inc, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded text-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{inc.item}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {inc.type === "quantity_mismatch" 
                              ? `Qty: Expected ${inc.expected}, Got ${inc.actual}`
                              : `Price: Expected ${formatCurrency(inc.expected)}, Got ${formatCurrency(inc.actual)}`
                            }
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">{new Date(inc.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button 
            variant="outline" 
            onClick={() => setSelectedSupplierId("")}
            className="w-full"
          >
            View All Suppliers
          </Button>
        </>
      ) : null}

      {suppliers.length === 0 && (
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No suppliers found</p>
            <p className="text-sm text-slate-400 mt-2">Create suppliers to track their reliability</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}