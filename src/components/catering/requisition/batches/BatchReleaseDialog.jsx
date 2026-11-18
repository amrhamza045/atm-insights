import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { errorText, releaseBatch } from "../requisitionApi";

const qtyOf = (l) => Number(l.quantity ?? l.quantity_reserved) || 0;

/**
 * Inventory releases one batch: the actual quantity issued per line (0 … batch quantity, default the batch quantity).
 * Less than the batch quantity is recorded as a variance and nothing stays held.
 */
export default function BatchReleaseDialog({ batch, requisitionId, revision, proposalOpen, onClose, onDone }) {
  const [qty, setQty] = useState({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setQty(Object.fromEntries((batch?.lines || []).map((l) => [l.reservation_id, String(qtyOf(l))])));
    setComment("");
  }, [batch]);
  if (!batch) return null;

  const invalid = batch.lines.some((l) => {
    const v = Number(qty[l.reservation_id]);
    return qty[l.reservation_id] === "" || !Number.isFinite(v) || v < 0 || v > qtyOf(l);
  });
  const submit = async () => {
    setBusy(true);
    try {
      await releaseBatch({
        requisition_id: requisitionId, revision, slip_id: batch.slip_id, comment,
        lines: batch.lines.map((l) => ({ reservation_id: l.reservation_id, actual_quantity: Number(qty[l.reservation_id]) })),
      });
      toast.success(`Batch ${batch.batch_number} released — stock issued`);
      onDone?.();
    } catch (e) {
      toast.error(errorText(e, "Couldn't release the batch"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Release batch {batch.batch_number} · {batch.slip_number}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Enter what you actually issue. Less than the batch quantity is recorded as a variance; nothing stays held.</p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {batch.lines.map((l) => (
            <div key={l.reservation_id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">{l.inventory_item_name} <span className="text-xs text-muted-foreground">(batch {qtyOf(l)} {l.unit})</span></span>
              <Input type="number" min="0" max={qtyOf(l)} step="any" className="w-28" value={qty[l.reservation_id] ?? ""}
                onChange={(e) => setQty({ ...qty, [l.reservation_id]: e.target.value })} />
            </div>
          ))}
        </div>
        <Textarea rows={2} placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        {proposalOpen && <p className="text-xs text-warning-700">The open batch plan proposal will be cancelled.</p>}
        {invalid && <p className="text-xs text-destructive">Each quantity must be between 0 and the batch quantity.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || invalid}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Release & issue stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}