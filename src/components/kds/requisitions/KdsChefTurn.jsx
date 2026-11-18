import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import RequisitionLinesTable from "@/components/catering/requisition/RequisitionLinesTable";
import { errorText, isStale, isAgreed, saveExtraLine, respondRequisition } from "@/components/catering/requisition/requisitionApi";
import ChefResponseControl, { responseComplete } from "./ChefResponseControl";
import ExtraLineForm from "./ExtraLineForm";

const needsResponse = (l) => !isAgreed(l) && ["edited", "declined"].includes(l.inventory_decision);
const addedThisTurn = (l) => l.line_type === "extra" && !isAgreed(l) && (l.inventory_decision || "pending") === "pending";

/** Chef's turn after Inventory replied: accept / counter each edit or decline, add or remove extras, send. */
export default function KdsChefTurn({ requisition: r, lines, refresh }) {
  const [responses, setResponses] = useState({});
  const [editing, setEditing] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const needing = lines.filter(needsResponse);
  const complete = needing.every((l) => responseComplete(l, responses[l.id]));

  const run = async (action, success) => {
    setBusy(true);
    try {
      const res = await action();
      if (res?.data?.status === "pending_approval") {
        toast.warning(
          res.data.approval_reason ||
            "Over the event's remaining allowance — sent to Approval Center"
        );
      } else {
        toast.success(success);
      }
      await refresh();
      return true;
    }
    catch (e) { toast.error(errorText(e, "That didn't work")); if (isStale(e)) await refresh(); return false; }
    finally { setBusy(false); }
  };
  const remove = (l) => run(() => saveExtraLine({ requisition_id: r.id, action: "remove", line_id: l.id }), "Extra line removed");
  const send = async () => {
    const payload = needing.map((l) => ({ line_id: l.id, ...responses[l.id], quantity: responses[l.id].quantity === undefined ? undefined : Number(responses[l.id].quantity) }));
    if (await run(() => respondRequisition(r.id, r.current_revision || 0, payload, comment), "Response sent")) { setResponses({}); setComment(""); }
  };
  const removeBtn = (l) => <Button size="icon" variant="ghost" disabled={busy} onClick={() => remove(l)}><Trash2 className="w-4 h-4 text-danger-600" /></Button>;

  return (
    <div className="space-y-4">
      <p className="text-sm">Inventory replied. Accept or counter each edited or declined line. Agreed lines are locked.</p>
      <RequisitionLinesTable
        lines={lines}
        renderActions={(l) => isAgreed(l) ? <Lock className="w-4 h-4 text-muted-foreground inline" />
          : needsResponse(l) ? (
            <span className="inline-flex items-start gap-1">
              <ChefResponseControl line={l} value={responses[l.id]} onChange={(v) => setResponses((p) => ({ ...p, [l.id]: v }))} />
              {l.line_type === "extra" && removeBtn(l)}
            </span>
          ) : addedThisTurn(l) ? (
            <span className="inline-flex gap-1">
              <Button size="icon" variant="ghost" disabled={busy} onClick={() => setEditing(l)}><Pencil className="w-4 h-4" /></Button>
              {removeBtn(l)}
            </span>
          ) : null}
      />
      {editing
        ? <ExtraLineForm requisition={r} line={editing} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />
        : <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing({})}><Plus className="w-4 h-4" /> Add extra item</Button>}
      <div className="space-y-2 border-t border-border pt-3">
        <Textarea placeholder="Comment for Inventory (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button className="gap-1.5" disabled={busy || !complete || !!editing || !lines.length} onClick={send}><Send className="w-4 h-4" /> Send response</Button>
        {!complete && <p className="text-xs text-muted-foreground">Respond to every edited or declined line. A counter needs a new quantity and a comment.</p>}
      </div>
    </div>
  );
}