import React from "react";
import { AlertTriangle, Truck } from "lucide-react";

const ORDER_STATUS = {
  recommended: "awaiting approval", pending_approval: "awaiting approval", pending: "approved",
  confirmed: "confirmed by the supplier", shipped: "shipped", delivered: "received",
};

/**
 * One release-slip line, read-only. freeStock is passed only while the slip still waits to be released.
 * order is the live purchase order bringing this item for the event: until it is received the line
 * shows "on order" instead of a shortfall.
 */
export default function ReleaseSlipLineEditor({ line, freeStock, order }) {
  const waiting = freeStock != null;
  const received = order?.status === "delivered";
  const lacking = waiting && (freeStock < Number(line.quantity_reserved) || (!received && Number(line.shortfall_quantity) > 0));
  const onOrder = lacking && !!order && !received;
  const short = lacking && !onOrder;
  const tone = short ? "border-red-200 bg-red-50" : onOrder ? "border-amber-200 bg-amber-50" : "border-slate-200";
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-medium text-sm text-slate-900">{line.inventory_item_name}</p><p className="text-xs text-slate-500">{line.purpose?.replace(/_/g, " ")}{line.produced_item_name ? ` · for ${line.produced_item_name}` : ""}</p></div>
        {short && <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />}
        {onOrder && <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><span className="text-slate-500">Reserved</span><p className="font-semibold">{line.quantity_reserved} {line.unit}</p></div>
        <div>{waiting && <><span className="text-slate-500">Free now</span><p className={short ? "font-semibold text-red-700" : "font-semibold"}>{freeStock} {line.unit}</p></>}</div>
        <div><span className="text-slate-500">Actual</span><p className="font-semibold">{line.actual_quantity ?? "—"} {line.unit}</p></div>
      </div>
      {short && <p className="text-xs text-red-700">Free stock is below this line's quantity — Inventory can only release what is on hand.</p>}
      {onOrder && <p className="text-xs text-amber-800">On order — {order.number} ({ORDER_STATUS[order.status] || order.status}). Inventory can release it once the stock arrives.</p>}
      {line.actual_quantity != null && <p className="text-xs text-slate-500">Variance: {Number(line.variance_quantity) > 0 ? "+" : ""}{line.variance_quantity || 0} {line.unit}</p>}
    </div>
  );
}