import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function ShortageRequestDialog({ order, onClose }) {
  const [data, setData] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    base44.functions.invoke("submitKitchenPurchaseRequest", { production_order_id: order.id, mode: "preview" })
      .then((res) => setData(res.data))
      .catch((e) => setData({ error: e?.response?.data?.error || e.message, shortages: [], sub_shortages: [] }));
  }, [order.id]);

  const isEventOrder = order.order_source === "catering" && !!order.catering_event_id;
  const pending = (data?.shortages || []).filter((s) => !s.existing_request && !s.awaiting_requisition_release);
  const subs = data?.sub_shortages || [];
  const subPending = subs.filter((s) => !s.existing_order);
  const [creating, setCreating] = useState(false);

  const createSubOrders = async () => {
    setCreating(true);
    try {
      const res = await base44.functions.invoke("submitKitchenPurchaseRequest", { production_order_id: order.id, mode: "create_sub_orders" });
      toast.success(`Created ${res.data.created} sub-recipe batch(es) — start them in Production`);
      onClose(true);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setCreating(false);
    }
  };

  const submit = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("submitKitchenPurchaseRequest", { production_order_id: order.id, mode: "submit", note });
      toast.success(`Sent ${res.data.created} request(s) to Purchasing`);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" /> Not enough stock to start</DialogTitle>
          <DialogDescription>
            {order.recipe_name} · {order.target_quantity || 1} batch(es)
          </DialogDescription>
        </DialogHeader>
        {order.catering_event_name ? (
          <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <CalendarDays className="w-4 h-4 text-amber-700" /> Event: <b>{order.catering_event_name}</b>
            {order.needed_by_date && <span className="text-slate-500">· needed by {order.needed_by_date}</span>}
          </div>
        ) : (
          <p className="text-xs text-slate-500">This batch isn't linked to a catering event.</p>
        )}
        {!data ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.error ? (
          <p className="text-sm text-red-600 py-4">{data.error}</p>
        ) : (data.shortages.length === 0 && subs.length === 0) ? (
          <p className="text-sm text-green-700 py-4">Stock is now sufficient — close this and start the batch.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {subs.map((s) => (
              <div key={`sub-${s.inventory_item_id}`} className="border border-purple-200 bg-purple-50/50 rounded-md p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{s.inventory_item_name} <Badge variant="outline" className="ml-1 text-purple-700 border-purple-300">Sub-recipe</Badge></span>
                  <span>Short <b>{s.quantity_missing} {s.unit}</b></span>
                </div>
                <p className="text-xs text-slate-500">
                  Need {s.quantity_needed} {s.unit}, free stock {s.quantity_available} · produce {s.sub_batches} batch(es) of {s.sub_recipe_name}{s.via ? ` (for ${s.via})` : ""}
                </p>
                {s.existing_order && <Badge className="mt-1 bg-blue-100 text-blue-700">Batch already queued ({s.existing_order.status.replace("_", " ")})</Badge>}
              </div>
            ))}
            {data.shortages.map((s) => (
              <div key={s.inventory_item_id} className="border rounded-md p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{s.inventory_item_name}</span>
                  <span>{isEventOrder ? "Missing in custody" : "Request"} <b>{s.quantity_requested} {s.unit}</b></span>
                </div>
                <p className="text-xs text-slate-500">
                  Need {s.quantity_needed} {s.unit}, {isEventOrder ? "event kitchen custody" : "free stock"} {s.quantity_available}
                  {s.for_sub_recipes?.length > 0 && ` · includes needs of ${s.for_sub_recipes.join(", ")}`}
                </p>
                {s.unreleased_reserved > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1.5">
                    {s.unreleased_reserved} {s.unit} is reserved for this event on an unreleased Requisition Batch — release the batch in Inventory → Requested Items first.
                  </p>
                )}
                {s.existing_request && <Badge className="mt-1 bg-blue-100 text-blue-700">Already requested ({s.existing_request.status.replace("_", " ")})</Badge>}
                {s.open_pos.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">
                    On open POs (not yet received): {s.open_pos.map((p) => `${p.order_number || "PO"} · ${p.status}${p.same_event ? " · this event" : ""}`).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {pending.length > 0 && <Textarea placeholder="Note for Purchasing (optional)" value={note} onChange={(e) => setNote(e.target.value)} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>Cancel</Button>
          {subPending.length > 0 && (
            <Button disabled={creating} onClick={createSubOrders} className="bg-purple-600 hover:bg-purple-700">
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create {subPending.length} sub-recipe batch(es)
            </Button>
          )}
          <Button disabled={!pending.length || sending} onClick={submit} className="bg-blue-600 hover:bg-blue-700">
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send {pending.length} request(s) to Purchasing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}