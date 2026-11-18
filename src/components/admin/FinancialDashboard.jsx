import React, { useState } from "react";
import { companyToday } from "@/components/utils/timezoneHelper";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, PoundSterling, ShoppingCart } from "lucide-react";
import MenuProfitabilityView from "./MenuProfitabilityView";
import DailyFinancialReport from "./DailyFinancialReport";

export default function FinancialDashboard() {
  const [selectedDate, setSelectedDate] = useState(companyToday());

  const { data: dailySummary } = useQuery({
    queryKey: ["dailyFinancialSummary", selectedDate],
    queryFn: async () => {
      const results = await base44.entities.DailyFinancialSummary.filter({ business_date: selectedDate });
      return results[0];
    }
  });

  const { data: menuAnalysis = [] } = useQuery({
    queryKey: ["menuProfitability", selectedDate],
    queryFn: async () => {
      const results = await base44.entities.MenuProfitabilityAnalysis.filter({
        analysis_period_start: selectedDate
      });
      return results;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Financial Dashboard</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
      </div>

      {/* Key Metrics */}
      {dailySummary && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{dailySummary.total_revenue?.toFixed(2)} EGP</p>
              <p className="text-xs text-slate-500 mt-1">{dailySummary.number_of_covers || 0} covers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600">Cost of Goods Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{dailySummary.total_cogs?.toFixed(2)} EGP</p>
              <p className="text-xs text-slate-500 mt-1">{dailySummary.overall_cogs_percentage?.toFixed(1)}% of revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600">Gross Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{dailySummary.gross_profit?.toFixed(2)} EGP</p>
              <p className="text-xs text-slate-500 mt-1">{dailySummary.gross_profit_margin?.toFixed(1)}% margin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600">Operating Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${dailySummary.operating_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dailySummary.operating_profit?.toFixed(2)} EGP
              </p>
              <p className="text-xs text-slate-500 mt-1">{dailySummary.operating_margin_percentage?.toFixed(1)}% margin</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Breakdown */}
      {dailySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-slate-600">Food Revenue</p>
                <p className="text-xl font-bold text-green-700">{dailySummary.food_revenue?.toFixed(2)} EGP</p>
                <p className="text-xs text-slate-500 mt-1">Food Cost: {dailySummary.food_cost_percentage?.toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">Beverage Revenue</p>
                <p className="text-xl font-bold text-blue-700">{dailySummary.beverage_revenue?.toFixed(2)} EGP</p>
                <p className="text-xs text-slate-500 mt-1">Beverage Cost: {dailySummary.beverage_cost_percentage?.toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Avg Check</p>
                <p className="text-xl font-bold text-slate-700">{dailySummary.average_check?.toFixed(2)} EGP</p>
                <p className="text-xs text-slate-500 mt-1">Per {dailySummary.number_of_covers || 0} customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="profitability">
        <TabsList>
          <TabsTrigger value="profitability">Menu Profitability</TabsTrigger>
          <TabsTrigger value="daily-report">Daily Report</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability">
          <MenuProfitabilityView menuAnalysis={menuAnalysis} selectedDate={selectedDate} />
        </TabsContent>

        <TabsContent value="daily-report">
          <DailyFinancialReport dailySummary={dailySummary} selectedDate={selectedDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}