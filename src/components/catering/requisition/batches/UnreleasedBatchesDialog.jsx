import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Loader2 } from "lucide-react";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import BatchReleaseDialog from "./BatchReleaseDialog";

const CLOSE_FLAG = { stock: "catering_edit", finalize: "catering_approve" };

/**
 * Closeout found unreleased batches. Hold (keep them, close nothing), Release now (requisition_release),
 * or Close anyway with a reason (voids only the unreleased batches; needs the closeout screen's flag).
 */
export default function UnreleasedBatchesDialog({ batches, context, onHold, onRetry, onCloseAnyway }) {
  const { assigned } = usePermissions();
  const canRelease = assigned?.requisition_release === true;
  const canClose = assigned?.[CLOSE_FLAG[context]] === true;
  const [releasing, setReleasing] = useState(null);
  const [anyway, setAnyway] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const closeAnyway = async () => { setBusy(true); try { await onCloseAnyway(reason.trim()); } finally { setBusy(false); } };

  return (
    <>
      <Dialog open={!releasing} onOpenChange={(o) => !o && !busy && onHold()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Batches not released yet</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This event can't be closed while these batches are still scheduled.</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {batches.map((b) => (
              <div key={b.slip_id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-2">
                <div className="text-sm min-w-0">
                  <p className="font-medium">{b.requisition_number} · Batch {b.batch_number} · {b.slip_number}</p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{b.needed_by_date} · {b.lines.length} line(s)</p>
                </div>
                {canRelease && <Button size="sm" onClick={() => setReleasing(b)} disabled={busy}>Release now</Button>}
              </div>
            ))}
          </div>
          {anyway && (
            <div className="space-y-1">
              <Textarea rows={2} placeholder="Reason for closing anyway (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <p className="text-xs text-muted-foreground">Only the unreleased batches are voided and their stock returned; released batches stay as they are.</p>
            </div>
          )}
          {!canRelease && <p className="text-xs text-muted-foreground">Releasing a batch needs the Inventory release batches permission.</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onHold} disabled={busy}>Hold — keep batches</Button>
            {canClose && (!anyway
              ? <Button variant="destructive" onClick={() => setAnyway(true)}>Close anyway…</Button>
              : <Button variant="destructive" onClick={closeAnyway} disabled={busy || !reason.trim()}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Void unreleased & close</Button>)}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {releasing && (
        <BatchReleaseDialog batch={releasing} requisitionId={releasing.requisition_id} revision={releasing.current_revision}
          onClose={() => setReleasing(null)} onDone={async () => { setReleasing(null); await onRetry(); }} />
      )}
    </>
  );
}