import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Boxes, ChefHat, AlertTriangle } from "lucide-react";

const BATCH_STATUS = {
  pending: { label: "Not yet started", cls: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In production", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Ready", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

export function StockPullsList({ reservations }) {
  const pulls = reservations.filter((r) => r.purpose === "stock_pull");
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
        <Boxes className="w-4 h-4 text-slate-400" /> Stock pulls ({pulls.length})
      </h3>
      {pulls.length === 0 ? (
        <p className="text-sm text-slate-500">No direct stock pulls for this event.</p>
      ) : (
        <div className="divide-y">
          {pulls.map((r) => (
            <div key={r.id} className="py-2 flex items-center justify-between text-sm">
              <span className="text-slate-700">{r.inventory_item_name}</span>
              <span className="flex items-center gap-2">
                <span className="text-slate-600">{r.quantity_reserved} {r.unit}</span>
                {r.shortfall_quantity > 0 ? (
                  ["po_pending", "po_approved", "po_delivered"].includes(r.procurement_status) ? (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      {r.procurement_status === "po_delivered" ? "Delivered" : r.procurement_status === "po_approved" ? "On order" : "PO awaiting approval"}
                      {r.purchase_order_number ? ` · ${r.purchase_order_number}` : ""}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 text-xs">Short {r.shortfall_quantity} {r.unit}</Badge>
                  )
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">Reserved</Badge>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ProductionBatchList({ orders, reservations }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
        <ChefHat className="w-4 h-4 text-slate-400" /> Production batches ({orders.length})
      </h3>
      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing needs in-house production for this event.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const inputs = reservations.filter((r) => r.production_order_id === o.id);
            const short = inputs.filter((r) => r.shortfall_quantity > 0);
            const st = BATCH_STATUS[o.status] || BATCH_STATUS.pending;
            return (
              <div key={o.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{o.output_item_name}</p>
                    <p className="text-xs text-slate-500">
                      {o.recipe_name} · needs {o.required_output_quantity} {o.output_unit} → {o.target_quantity} batch(es)
                      {o.needed_by_date ? ` · ready by ${o.needed_by_date}` : ""}
                    </p>
                  </div>
                  <Badge className={`${st.cls} text-xs`}>{st.label}</Badge>
                </div>

                {inputs.length > 0 && (
                  <div className="mt-2 border-t border-slate-100 pt-2 space-y-1">
                    {inputs.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs">
                        <span className="text-slate-600">{r.inventory_item_name}</span>
                        <span className={r.shortfall_quantity > 0 ? "text-red-600" : "text-slate-600"}>
                          {r.quantity_reserved} {r.unit}
                          {r.shortfall_quantity > 0 ? ` · short ${r.shortfall_quantity}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {short.length > 0 && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {short.length} ingredient(s) short for this batch
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}