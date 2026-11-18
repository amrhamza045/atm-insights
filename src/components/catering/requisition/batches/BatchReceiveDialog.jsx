import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { errorText, receiveBatch } from "../requisitionApi";

/** The chef confirms a released batch arrived, with an optional comment (e.g. a shortage note). */
export default function BatchReceiveDialog({ batch, requisitionId, revision, onClose, onDone }) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  if (!batch) return null;
  const submit = async () => {
    setBusy(true);
    try {
      await receiveBatch({ requisition_id: requisitionId, revision, slip_id: batch.slip_id, comment });
      toast.success(`Batch ${batch.batch_number} marked received`);
      onDone?.();
    } catch (e) {
      toast.error(errorText(e, "Couldn't confirm receipt"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Confirm batch {batch.batch_number} received</DialogTitle></DialogHeader>
        <Textarea rows={3} placeholder="Comment (optional) — e.g. anything short or damaged" value={comment} onChange={(e) => setComment(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Confirm received</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}