import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PackageCheck } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function PurchasedCartHistory({ orders }) {
  if (!orders.length) {
    return (
      <Card className="p-8 text-center text-sm text-slate-500">
        No previously purchased carts.
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
          <PackageCheck className="h-5 w-5 shrink-0 text-green-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{order.order_number}</p>
            <p className="truncate text-sm text-slate-600">
              {(order.catering_event_names || [order.catering_event_name]).filter(Boolean).join(", ")}
            </p>
            <p className="text-xs text-slate-500">
              {order.supplier || "No supplier"} · {order.items?.length || 0} item(s)
              {order.purchase_recorded_at ? ` · Purchased ${new Date(order.purchase_recorded_at).toLocaleDateString()}` : ""}
            </p>
          </div>
          <div className="text-right">
            <Badge className="mb-1 border-green-200 bg-green-100 text-green-700">Purchased</Badge>
            <p className="text-sm font-semibold text-slate-900">{formatCurrency(order.total_amount)}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}