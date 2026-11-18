import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";

export default function SupplierPriceAdvisory() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const { selectedBranchId } = useBranch();

  const { data: invoices = [] } = useQuery({
    queryKey: ["purchaseInvoices", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.PurchaseInvoice.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        100
      );
      return all.filter(inv => inv.branch_id && (!selectedBranchId || inv.branch_id === selectedBranchId));
    }
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItems", selectedBranchId],
    queryFn: async () => {
      const items = await base44.entities.InventoryItem.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        1000
      );
      return items.filter(i => !selectedBranchId || i.branch_id === selectedBranchId);
    }
  });

  const handleAnalyze = async () => {
    if (invoices.length === 0) {
      toast.error("No invoice data to analyze");
      return;
    }

    setLoading(true);
    try {
      const prompt = `Analyze the following invoice data and identify:
1. Price gaps between different suppliers for the same inventory item (flag if gap > 15%)
2. Price inconsistencies within same supplier across invoices (flag if gap > 10%)
3. Suspicious pricing patterns or outliers

Invoice Data:
${JSON.stringify(invoices.map(inv => ({
  invoice_number: inv.invoice_number,
  supplier_name: inv.supplier_name,
  invoice_date: inv.invoice_date,
  items: inv.items?.map(item => ({
    name: item.inventory_item_name,
    quantity: item.quantity,
    unit_price: item.purchase_price,
    total: item.total_cost
  }))
})), null, 2)}

Provide analysis in JSON format with:
- supplier_gaps: array of {item_name, suppliers: [{name, price, date}], gap_percentage, recommendation}
- supplier_inconsistencies: array of {supplier_name, item_name, prices: [{price, date}], gap_percentage, concern}
- suspicious_patterns: array of {description, severity: "high"|"medium"|"low", affected_items}
- summary: brief summary of findings`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            supplier_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  suppliers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        price: { type: "number" },
                        date: { type: "string" }
                      }
                    }
                  },
                  gap_percentage: { type: "number" },
                  recommendation: { type: "string" }
                }
              }
            },
            supplier_inconsistencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  supplier_name: { type: "string" },
                  item_name: { type: "string" },
                  prices: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        price: { type: "number" },
                        date: { type: "string" }
                      }
                    }
                  },
                  gap_percentage: { type: "number" },
                  concern: { type: "string" }
                }
              }
            },
            suspicious_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  severity: { type: "string" },
                  affected_items: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setAnalysis(result);
      toast.success("Price analysis complete");
    } catch (error) {
      toast.error("Analysis failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Supplier Price Advisory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            AI-powered analysis to identify price gaps between suppliers and invoices
          </p>
          <Button onClick={handleAnalyze} disabled={loading || invoices.length === 0}>
            {loading ? "Analyzing..." : "Analyze Prices"}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">{analysis.summary}</p>
            </CardContent>
          </Card>

          {/* Supplier Gaps */}
          {analysis.supplier_gaps?.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                  <TrendingUp className="w-4 h-4" />
                  Price Gaps Between Suppliers ({analysis.supplier_gaps.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.supplier_gaps.map((gap, idx) => (
                  <div key={idx} className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{gap.item_name}</p>
                      <Badge className="bg-orange-600">Gap: {gap.gap_percentage?.toFixed(1)}%</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      {gap.suppliers?.map((sup, sidx) => (
                        <div key={sidx} className="p-2 bg-white rounded border">
                          <p className="font-medium">{sup.name}</p>
                          <p className="text-slate-600">{formatCurrency(sup.price)}</p>
                          <p className="text-slate-500 text-xs">{new Date(sup.date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-orange-700 bg-white p-2 rounded">
                      💡 {gap.recommendation}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Supplier Inconsistencies */}
          {analysis.supplier_inconsistencies?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  Price Inconsistencies Within Suppliers ({analysis.supplier_inconsistencies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.supplier_inconsistencies.map((incon, idx) => (
                  <div key={idx} className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{incon.supplier_name}</p>
                        <p className="text-xs text-slate-600">{incon.item_name}</p>
                      </div>
                      <Badge className="bg-red-600">Gap: {incon.gap_percentage?.toFixed(1)}%</Badge>
                    </div>
                    <div className="text-xs space-y-1 mb-2">
                      {incon.prices?.map((p, pidx) => (
                        <div key={pidx} className="text-slate-600">
                          {formatCurrency(p.price)} on {new Date(p.date).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-red-700 bg-white p-2 rounded">
                      ⚠️ {incon.concern}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suspicious Patterns */}
          {analysis.suspicious_patterns?.length > 0 && (
            <Card className="border-red-300 bg-red-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-800">
                  <TrendingDown className="w-4 h-4" />
                  Suspicious Patterns ({analysis.suspicious_patterns.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis.suspicious_patterns.map((pattern, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm">{pattern.description}</p>
                      <Badge
                        className={
                          pattern.severity === "high"
                            ? "bg-red-600"
                            : pattern.severity === "medium"
                              ? "bg-orange-600"
                              : "bg-yellow-600"
                        }
                      >
                        {pattern.severity.toUpperCase()}
                      </Badge>
                    </div>
                    {pattern.affected_items?.length > 0 && (
                      <p className="text-xs text-slate-600 mt-2">
                        Affects: {pattern.affected_items.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {analysis.supplier_gaps?.length === 0 &&
            analysis.supplier_inconsistencies?.length === 0 &&
            analysis.suspicious_patterns?.length === 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <p className="text-center text-sm text-green-700">
                    ✓ No significant price anomalies detected. Pricing looks healthy!
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}