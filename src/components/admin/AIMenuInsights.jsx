import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, PoundSterling, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AIMenuInsights({ menuItems, onUpdatePrice }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["aiOrders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500)
  });

  const analyzeMenu = async () => {
    setAnalyzing(true);
    try {
      // Prepare sales data
      const itemSales = {};
      orders.filter(o => o.status === 'paid').forEach(order => {
        order.items?.forEach(item => {
          const key = item.menu_item_id || item.name;
          if (!itemSales[key]) {
            itemSales[key] = {
              name: item.name,
              quantity: 0,
              revenue: 0,
              orders: 0
            };
          }
          itemSales[key].quantity += item.quantity || 1;
          itemSales[key].revenue += (item.price || 0) * (item.quantity || 1);
          itemSales[key].orders += 1;
        });
      });

      // Enrich with menu item data
      const enrichedData = menuItems.map(item => {
        const sales = itemSales[item.id] || { quantity: 0, revenue: 0, orders: 0 };
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          current_price: item.price,
          indirect_price: item.indirect_price || item.price,
          cost: item.total_cost || 0,
          quantity_sold: sales.quantity,
          revenue: sales.revenue,
          orders: sales.orders,
          margin: item.price > 0 && item.total_cost > 0 ? ((item.price - item.total_cost) / item.price * 100) : 0
        };
      });

      // Call AI for insights
      const prompt = `You are a restaurant menu optimization expert. Analyze this menu data and provide actionable insights.

Menu Items Data:
${JSON.stringify(enrichedData, null, 2)}

Provide a comprehensive analysis including:
1. **Pricing Recommendations**: For each item, suggest optimal price adjustments based on cost, margin, and sales performance
2. **Underperforming Items**: Identify items with low sales (<5 orders) or poor margins (<40%)
3. **Stars**: High-revenue items that should be promoted
4. **Actions**: Specific recommendations (increase price, promote, bundle, remove, adjust cost)

Consider:
- Target margin should be 60-70%
- Items with <5 orders may be underperforming
- High-volume items can handle slight price increases
- Low-margin items need cost reduction or price increase`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            pricing_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  item_id: { type: "string" },
                  current_price: { type: "number" },
                  suggested_price: { type: "number" },
                  reason: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            underperforming_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  item_id: { type: "string" },
                  reason: { type: "string" },
                  recommendation: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            star_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_name: { type: "string" },
                  item_id: { type: "string" },
                  revenue: { type: "number" },
                  strategy: { type: "string" }
                }
              }
            },
            general_insights: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setInsights(response);
      toast.success("AI analysis complete");
    } catch (error) {
      toast.error("Failed to analyze menu");
      console.error("AI analysis error:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyPriceRecommendation = async (recommendation) => {
    if (onUpdatePrice) {
      await onUpdatePrice(recommendation.item_id, recommendation.suggested_price);
      toast.success(`Updated ${recommendation.item_name} price`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Menu Insights
              </CardTitle>
              <CardDescription>
                AI-powered analysis of your menu performance, pricing, and optimization opportunities
              </CardDescription>
            </div>
            <Button 
              onClick={analyzeMenu} 
              disabled={analyzing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Menu
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {insights && (
        <>
          {/* General Insights */}
          {insights.general_insights?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.general_insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1">•</span>
                      <span className="text-sm text-slate-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Star Items */}
          {insights.star_items?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Star Performers ({insights.star_items.length})
                </CardTitle>
                <CardDescription>High-revenue items worth promoting</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {insights.star_items.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-green-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-green-900">{item.item_name}</h4>
                          <p className="text-sm text-green-700">Revenue: {formatCurrency(item.revenue)}</p>
                        </div>
                        <Badge className="bg-green-600">Star</Badge>
                      </div>
                      <p className="text-sm text-slate-700">{item.strategy}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Recommendations */}
          {insights.pricing_recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PoundSterling className="w-5 h-5 text-blue-600" />
                  Pricing Recommendations ({insights.pricing_recommendations.length})
                </CardTitle>
                <CardDescription>AI-suggested price optimizations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.pricing_recommendations.map((rec, idx) => {
                    const priceChange = rec.suggested_price - rec.current_price;
                    const percentChange = ((priceChange / rec.current_price) * 100).toFixed(1);
                    
                    return (
                      <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{rec.item_name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-slate-600">
                                Current: {formatCurrency(rec.current_price)}
                              </span>
                              <span className="text-sm font-medium text-blue-600">
                                → Suggested: {formatCurrency(rec.suggested_price)}
                              </span>
                              <Badge className={priceChange > 0 ? "bg-green-600" : "bg-amber-600"}>
                                {priceChange > 0 ? '+' : ''}{percentChange}%
                              </Badge>
                            </div>
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => applyPriceRecommendation(rec)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Apply
                          </Button>
                        </div>
                        <p className="text-sm text-slate-700 mb-1"><strong>Reason:</strong> {rec.reason}</p>
                        <p className="text-sm text-slate-600"><strong>Expected Impact:</strong> {rec.expected_impact}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Underperforming Items */}
          {insights.underperforming_items?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Underperforming Items ({insights.underperforming_items.length})
                </CardTitle>
                <CardDescription>Items that need attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.underperforming_items.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-red-900">{item.item_name}</h4>
                        <Badge className={
                          item.action === 'remove' ? "bg-red-600" :
                          item.action === 'promote' ? "bg-amber-600" :
                          "bg-blue-600"
                        }>
                          {item.action}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-2"><strong>Issue:</strong> {item.reason}</p>
                      <div className="bg-white rounded p-3 border border-red-200">
                        <p className="text-sm font-medium text-slate-900 mb-1">Recommendation:</p>
                        <p className="text-sm text-slate-700">{item.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!insights && !analyzing && (
        <Card className="p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto text-purple-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready for AI Analysis</h3>
          <p className="text-sm text-slate-600 mb-4">
            Click "Analyze Menu" to get intelligent insights on pricing, performance, and optimization opportunities
          </p>
          <p className="text-xs text-slate-500">
            Analysis considers sales data, cost margins, and customer preferences
          </p>
        </Card>
      )}
    </div>
  );
}