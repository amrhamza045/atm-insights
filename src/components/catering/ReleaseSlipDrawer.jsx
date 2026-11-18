import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import ReleaseSlipLineEditor from "./ReleaseSlipLineEditor";
import { useSlipLineOrders } from "./useSlipLineOrders";
import { currentFreeStock, getReleaseSlipMeta, isBatchSlip, batchLabel } from "./releaseSlipMeta";

/** Read-only slip view. Batch slips are released / received through their requisition; old-flow slips are history. */
export default function ReleaseSlipDrawer({ slip, open, onOpenChange, inventory, reservations }) {
  const orders = useSlipLineOrders(slip);
  if (!slip) return null;
  const batch = isBatchSlip(slip);
  const meta = getReleaseSlipMeta(slip.status);
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full sm:max-w-2xl overflow-y-auto"><SheetHeader><div className="flex items-center gap-2 pr-8"><SheetTitle>{slip.slip_number}</SheetTitle><Badge className={meta.className}>{meta.label}</Badge></div><SheetDescription>{slip.event_name} · Needed {slip.needed_by_date || slip.event_date}{batch ? ` · ${batchLabel(slip)}` : ""}</SheetDescription></SheetHeader>
    <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">{batch ? "Requisition batch slip: Inventory releases it from Requested Items and the chef confirms receipt on the Kitchen Display." : "Old release-slip flow: read-only history."}</p>
    <div className="mt-5 space-y-3">{slip.lines.map((line) => <ReleaseSlipLineEditor key={line.reservation_id} line={line} order={orders.get(line.inventory_item_id)} freeStock={slip.status === "scheduled" ? currentFreeStock(line, inventory, reservations, slip.event_id) : null} />)}</div>
    {slip.fulfilled_by && <div className="mt-5 text-xs text-slate-500">{batch ? "Released" : "Fulfilled"} by {slip.fulfilled_by} on {new Date(slip.fulfilled_date).toLocaleString()}</div>}
    {slip.received_by && <div className="mt-1 text-xs text-slate-500">Received by {slip.received_by_name || slip.received_by} on {new Date(slip.received_date).toLocaleString()}{slip.receipt_comment ? ` · ${slip.receipt_comment}` : ""}</div>}
    {slip.void_reason && <div className="mt-5 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">Void reason: {slip.void_reason}</div>}
  </SheetContent></Sheet>;
}