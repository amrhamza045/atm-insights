import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function CreditStandingCard({ client, events = [] }) {
  const outstanding = events.reduce((s, e) => s + (Number(e.balance_due) || 0), 0);
  const limit = Number(client.catering_credit_limit) || 0;
  const overLimit = limit > 0 && outstanding > limit;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-slate-500" /> Credit Standing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Catering credit limit</span>
          <span className="text-sm font-medium">{limit > 0 ? formatCurrency(limit, true) : "No limit set"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Outstanding catering balance</span>
          <span className="text-sm font-medium">{formatCurrency(outstanding, true)}</span>
        </div>
        {overLimit ? (
          <Badge variant="destructive">Over credit limit</Badge>
        ) : outstanding > 0 ? (
          <Badge variant="secondary">Balance outstanding</Badge>
        ) : (
          <Badge variant="outline">Clear</Badge>
        )}
      </CardContent>
    </Card>
  );
}