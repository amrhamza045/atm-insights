import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

// Shown when the selected table already has an order waiting for cashier approval —
// anything added now is appended to that same order instead of creating a second one.
export default function CaptainPendingOrderBanner({ pendingOrder }) {
  if (!pendingOrder) return null;
  const items = pendingOrder.order_items || [];
  const count = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Clock className="w-4 h-4" />
          Table already has a pending order
        </div>
        <Badge variant="outline" className="border-amber-400 text-amber-800">
          {count} item{count === 1 ? "" : "s"} · {formatCurrency(pendingOrder.estimated_total || 0)}
        </Badge>
      </div>
      <div className="text-xs text-amber-800 space-y-0.5 max-h-24 overflow-y-auto">
        {items.map((i, idx) => (
          <div key={idx} className="flex justify-between gap-2">
            <span>{i.quantity}× {i.name}</span>
            <span>{formatCurrency((i.price || 0) * (i.quantity || 0))}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-amber-700">New items will be added to this order.</p>
    </div>
  );
}