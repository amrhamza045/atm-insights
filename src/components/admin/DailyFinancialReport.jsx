import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DailyFinancialReport({ dailySummary, selectedDate }) {
  if (!dailySummary) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-500">
          No financial data available for {selectedDate}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Income Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Income Statement - {new Date(selectedDate).toLocaleDateString()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Revenue Section */}
            <div className="border-b pb-4">
              <p className="font-semibold mb-3">REVENUE</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Food Sales</span>
                  <span className="font-medium">{dailySummary.food_revenue?.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Beverage Sales</span>
                  <span className="font-medium">{dailySummary.beverage_revenue?.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total Revenue</span>
                  <span className="text-green-600">{dailySummary.total_revenue?.toFixed(2)} EGP</span>
                </div>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div className="border-b pb-4">
              <p className="font-semibold mb-3">COST OF GOODS SOLD</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Food Cost</span>
                  <span className="font-medium">{dailySummary.total_food_cost?.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">({dailySummary.food_cost_percentage?.toFixed(1)}% of food sales)</span>
                  <span />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Beverage Cost</span>
                  <span className="font-medium">{dailySummary.total_beverage_cost?.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">({dailySummary.beverage_cost_percentage?.toFixed(1)}% of beverage sales)</span>
                  <span />
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total COGS</span>
                  <span className="text-red-600">{dailySummary.total_cogs?.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>({dailySummary.overall_cogs_percentage?.toFixed(1)}% of total revenue)</span>
                  <span />
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="border-b pb-4">
              <div className="flex justify-between font-bold text-lg bg-green-50 p-3 rounded">
                <span>GROSS PROFIT</span>
                <span className="text-green-600">{dailySummary.gross_profit?.toFixed(2)} EGP</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">Gross Margin: {dailySummary.gross_profit_margin?.toFixed(1)}%</p>
            </div>

            {/* Operating Expenses */}
            <div className="border-b pb-4">
              <p className="font-semibold mb-3">OPERATING EXPENSES</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Labor Cost</span>
                  <span className="font-medium">{dailySummary.labor_cost?.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Other Operating Expenses</span>
                  <span className="font-medium">{(dailySummary.operating_expenses - dailySummary.labor_cost)?.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total Operating Expenses</span>
                  <span className="text-orange-600">{dailySummary.operating_expenses?.toFixed(2)} EGP</span>
                </div>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div>
              <div className={`flex justify-between font-bold text-lg p-3 rounded ${dailySummary.operating_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <span>OPERATING PROFIT</span>
                <span className={dailySummary.operating_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {dailySummary.operating_profit?.toFixed(2)} EGP
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2">Operating Margin: {dailySummary.operating_margin_percentage?.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Number of Covers</p>
              <p className="text-2xl font-bold">{dailySummary.number_of_covers || 0}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Average Check</p>
              <p className="text-2xl font-bold">{dailySummary.average_check?.toFixed(2) || '0.00'} EGP</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">Food Cost % Target</p>
              <p className="text-2xl font-bold">28-32%</p>
              <p className="text-xs text-slate-500 mt-1">Current: {dailySummary.food_cost_percentage?.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {dailySummary.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{dailySummary.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}