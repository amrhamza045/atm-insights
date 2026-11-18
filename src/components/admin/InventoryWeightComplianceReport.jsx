import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranch } from "@/components/branches/BranchContext";
import { Badge } from "@/components/ui/badge";
import { Scale, Mail, RefreshCw, AlertTriangle, CheckCircle, XCircle, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const fmtNum = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InventoryWeightComplianceReport() {
  // Follows the branch picked in the header.
  const { selectedBranchId } = useBranch();
  const branchId = selectedBranchId || "all";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [emailing, setEmailing] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["inventoryWeightCompliance", branchId, startDate, endDate],
    queryFn: async () => {
      const payload = {};
      if (branchId !== "all") payload.branch_id = branchId;
      if (startDate) payload.start_date = startDate;
      if (endDate) payload.end_date = endDate;
      const res = await base44.functions.invoke("generateInventoryWeightCompliance", payload);
      return res.data;
    }
  });

  const handleEmailReport = async () => {
    setEmailing(true);
    try {
      const payload = { send_email: true };
      if (branchId !== "all") payload.branch_id = branchId;
      if (startDate) payload.start_date = startDate;
      if (endDate) payload.end_date = endDate;
      const res = await base44.functions.invoke("generateInventoryWeightCompliance", payload);
      if (res.data?.success) {
        toast.success("Compliance report emailed successfully");
      } else {
        toast.error("Failed to send report");
      }
    } catch (e) {
      toast.error("Failed to email report: " + e.message);
    } finally {
      setEmailing(false);
    }
  };

  const rows = data?.rows || [];
  const summary = data?.summary || {};

  const statusIcon = (status) => {
    if (status === "critical") return <XCircle className="w-4 h-4 text-red-600" />;
    if (status === "warning") return <AlertTriangle className="w-4 h-4 text-warning-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const statusColor = (status) => {
    if (status === "critical") return "bg-red-50 border-red-200";
    if (status === "warning") return "bg-warning-50 border-warning-200";
    return "bg-green-50 border-green-200";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-warning-600" />
          Inventory Weight Compliance Report
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Compares Purchase Orders (IN) vs POS Consumption via Recipes (OUT) vs Current Inventory Balance
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8" />
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-1">
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleEmailReport} disabled={emailing} className="gap-1">
              <Mail className="w-3.5 h-3.5" />
              {emailing ? "Sending..." : "Email Report"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Calculating compliance...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No inventory items found for the selected filters.</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border text-center">
                <p className="text-xs text-slate-500">Total Items</p>
                <p className="text-xl font-bold text-slate-900">{summary.total_items}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <p className="text-xs text-blue-600">⚖️ Weight Items</p>
                <p className="text-xl font-bold text-blue-900">{summary.weight_items}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                <p className="text-xs text-green-600">✅ Compliant</p>
                <p className="text-xl font-bold text-green-900">{summary.compliant}</p>
              </div>
              <div className="p-3 bg-warning-50 rounded-lg border border-warning-200 text-center">
                <p className="text-xs text-warning-600">⚠️ Warning</p>
                <p className="text-xl font-bold text-warning-900">{summary.warning}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                <p className="text-xs text-red-600">❌ Critical</p>
                <p className="text-xl font-bold text-red-900">{summary.critical}</p>
              </div>
            </div>

            {/* Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2 text-left border border-slate-200">Item</th>
                    <th className="p-2 text-left border border-slate-200">Category</th>
                    <th className="p-2 text-right border border-slate-200">Purchased (IN)</th>
                    <th className="p-2 text-right border border-slate-200">Consumed (OUT)</th>
                    <th className="p-2 text-right border border-slate-200">Expected</th>
                    <th className="p-2 text-right border border-slate-200">Actual Stock</th>
                    <th className="p-2 text-right border border-slate-200">Discrepancy</th>
                    <th className="p-2 text-center border border-slate-200">Var %</th>
                    <th className="p-2 text-center border border-slate-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.inventory_item_id} className={`border border-slate-200 ${statusColor(r.status)}`}>
                      <td className="p-2 border border-slate-200 font-medium">
                        {r.is_weight ? "⚖️" : "📦"} {r.name}
                        <span className="block text-xs text-slate-400">{r.branch_name}</span>
                      </td>
                      <td className="p-2 border border-slate-200 text-slate-600">{r.category_name || "-"}</td>
                      <td className="p-2 border border-slate-200 text-right text-green-700 font-medium">
                        {fmtNum(r.total_purchased)} <span className="text-xs text-slate-400">{r.selling_unit_label}</span>
                      </td>
                      <td className="p-2 border border-slate-200 text-right text-warning-700 font-medium">
                        {fmtNum(r.total_consumed)} <span className="text-xs text-slate-400">{r.selling_unit_label}</span>
                      </td>
                      <td className="p-2 border border-slate-200 text-right text-slate-700 font-medium">
                        {fmtNum(r.expected_stock)} <span className="text-xs text-slate-400">{r.selling_unit_label}</span>
                      </td>
                      <td className="p-2 border border-slate-200 text-right font-bold text-slate-900">
                        {fmtNum(r.current_stock)} <span className="text-xs text-slate-400">{r.selling_unit_label}</span>
                      </td>
                      <td className={`p-2 border border-slate-200 text-right font-bold ${r.discrepancy < 0 ? "text-red-600" : "text-green-600"}`}>
                        {r.discrepancy > 0 ? "+" : ""}{fmtNum(r.discrepancy)}
                        {r.discrepancy < 0 && <TrendingDown className="w-3 h-3 inline ml-1" />}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-medium">
                        {r.discrepancy_pct > 0 ? "+" : ""}{r.discrepancy_pct.toFixed(1)}%
                      </td>
                      <td className="p-2 border border-slate-200 text-center">
                        <Badge variant="outline" className={`gap-1 ${r.status === "critical" ? "text-red-700 border-red-300" : r.status === "warning" ? "text-warning-700 border-warning-300" : "text-green-700 border-green-300"}`}>
                          {statusIcon(r.status)}
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculation Legend */}
            <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-sm text-warning-900">
              <p className="font-semibold mb-1">How compliance is calculated:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Purchased (IN):</strong> Sum of received quantities from delivered Purchase Orders.</li>
                <li><strong>Consumed (OUT):</strong> Sum of (order item qty × recipe qty_needed) across all POS orders.</li>
                <li><strong>Expected Stock:</strong> Purchased − Consumed.</li>
                <li><strong>Discrepancy:</strong> Actual Inventory − Expected. Negative = missing (possible theft/waste). Positive = unrecorded additions.</li>
                <li><strong>Status:</strong> ✅ Within 5% · ⚠️ 5–20% · ❌ Over 20% variance</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}