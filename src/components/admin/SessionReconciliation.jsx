import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function SessionReconciliation({ session, cashSales, depositTotal, expenses, visaCredits, newRechargeCash = 0, returns, closingCash, expectedCash, difference }) {
  const isMatched = Math.abs(difference) < 0.01;
  const discrepancyPercent = ((Math.abs(difference) / expectedCash) * 100).toFixed(2);

  return (
    <div className="space-y-4">
      <Card className={isMatched ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isMatched ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-900">Cash Reconciliation Matched</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-900">Cash Discrepancy Detected</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Expected Cash</p>
              <p className="text-2xl font-bold text-slate-900">{expectedCash?.toFixed(2)} EGP</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Closing Cash Entered</p>
              <p className="text-2xl font-bold text-slate-900">{closingCash?.toFixed(2)} EGP</p>
            </div>
            <div className={`col-span-2 p-3 rounded-lg ${isMatched ? "bg-green-100" : "bg-red-100"}`}>
              <p className="text-sm font-semibold text-slate-700">Difference</p>
              <p className={`text-2xl font-bold ${isMatched ? "text-green-600" : "text-red-600"}`}>
                {difference >= 0 ? '+' : ''}{difference?.toFixed(2)} EGP
                {!isMatched && <span className="text-sm ml-2">({discrepancyPercent}%)</span>}
              </p>
            </div>
          </div>

          {!isMatched && (
            <div className="mt-4 pt-4 border-t border-red-200">
              <p className="text-sm font-semibold text-red-900 mb-2">Possible Reasons for Discrepancy:</p>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Human counting error when entering closing cash</li>
                <li>• Change given incorrectly or customer overpayment</li>
                <li>• Unrecorded expense or petty cash withdrawal</li>
                <li>• Register rounding differences</li>
                <li>• Customer refund not properly recorded</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600">Opening Cash</p>
              <p className="font-semibold">{(session?.opening_cash || 0).toFixed(2)} EGP</p>
            </div>
            <div>
              <p className="text-slate-600">Cash Sales</p>
              <p className="font-semibold text-green-600">+{cashSales.toFixed(2)} EGP</p>
            </div>
            <div>
              <p className="text-slate-600">Deposits</p>
              <p className="font-semibold text-green-600">+{depositTotal.toFixed(2)} EGP</p>
            </div>
            <div>
              <p className="text-slate-600">Delivery Cash</p>
              <p className="font-semibold text-green-600">+{visaCredits.toFixed(2)} EGP</p>
            </div>
            <div>
              <p className="text-slate-600">Recharge Cash</p>
              <p className="font-semibold text-blue-600">+{newRechargeCash.toFixed(2)} EGP</p>
            </div>
            <div>
              <p className="text-slate-600">Cash Expenses</p>
              <p className="font-semibold text-red-600">-{expenses.toFixed(2)} EGP</p>
            </div>
            <div>
              <p className="text-slate-600">Returns Refunded</p>
              <p className="font-semibold text-red-600">-{returns.toFixed(2)} EGP</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex justify-between text-base">
              <p className="font-semibold text-slate-900">Expected Cash</p>
              <p className="font-bold text-slate-900">{expectedCash?.toFixed(2)} EGP</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}