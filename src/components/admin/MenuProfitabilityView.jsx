import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export default function MenuProfitabilityView({ menuAnalysis, selectedDate }) {
  const analysisData = useMemo(() => {
    if (!menuAnalysis || menuAnalysis.length === 0) {
      return { items: [], summary: null };
    }

    // Calculate summary stats
    const totalRevenue = menuAnalysis.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
    const totalCost = menuAnalysis.reduce((sum, item) => sum + (item.total_food_cost || 0), 0);
    const totalUnits = menuAnalysis.reduce((sum, item) => sum + (item.units_sold || 0), 0);
    const avgCostPercentage = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    // Sort by profitability
    const sorted = [...menuAnalysis].sort((a, b) => 
      (b.average_contribution_margin_percentage || 0) - (a.average_contribution_margin_percentage || 0)
    );

    return {
      items: sorted,
      summary: {
        totalRevenue,
        totalCost,
        totalUnits,
        avgCostPercentage,
        avgGrossMargin: 100 - avgCostPercentage
      }
    };
  }, [menuAnalysis]);

  const getStatusBadge = (status) => {
    const variants = {
      high_profit: "bg-green-100 text-green-800",
      medium_profit: "bg-blue-100 text-blue-800",
      low_profit: "bg-yellow-100 text-yellow-800",
      loss: "bg-red-100 text-red-800",
      untracked: "bg-gray-100 text-gray-800"
    };
    return variants[status] || variants.untracked;
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {analysisData.summary && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg">Period Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{analysisData.summary.totalRevenue?.toFixed(2)} EGP</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Food Cost</p>
                <p className="text-2xl font-bold text-red-600">{analysisData.summary.totalCost?.toFixed(2)} EGP</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Avg Cost %</p>
                <p className="text-2xl font-bold text-orange-600">{analysisData.summary.avgCostPercentage?.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Gross Margin</p>
                <p className="text-2xl font-bold text-blue-600">{analysisData.summary.avgGrossMargin?.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Menu Item Analysis</h3>
        {analysisData.items.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-slate-500">
              No profitability data available for selected date
            </CardContent>
          </Card>
        ) : (
          analysisData.items.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-base">{item.menu_item_name}</h4>
                      <Badge className={getStatusBadge(item.profitability_status)}>
                        {item.profitability_status?.replace('_', ' ')}
                      </Badge>
                      {item.menu_mix_percentage > 15 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700">
                          {item.menu_mix_percentage?.toFixed(1)}% of sales
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{item.category} • {item.item_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{item.total_revenue?.toFixed(2)} EGP</p>
                    <p className="text-sm text-slate-500">{item.units_sold} units sold</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-slate-600">Price</p>
                    <p className="font-semibold">{item.selling_price?.toFixed(2)} EGP</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Food Cost</p>
                    <p className="font-semibold text-red-600">{item.average_unit_food_cost?.toFixed(2)} EGP</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Cost %</p>
                    <p className={`font-semibold ${item.average_food_cost_percentage < 30 ? 'text-green-600' : item.average_food_cost_percentage < 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {item.average_food_cost_percentage?.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Margin %</p>
                    <p className="font-semibold text-green-600">{item.average_contribution_margin_percentage?.toFixed(1)}%</p>
                  </div>
                </div>

                {item.recommended_action && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded flex gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-blue-700">{item.recommended_action}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}