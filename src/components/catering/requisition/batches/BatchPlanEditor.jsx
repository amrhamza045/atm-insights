import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, Trash2 } from "lucide-react";
import { clampBatchQty, draftOf, maxForBatchLine, payloadOf, remainingByLine } from "./batchPlan";
import BatchRemaining from "./BatchRemaining";

/** Split lines across batches, move them, change dates, add or remove batches. Totals must match the agreed quantities. */
export default function BatchPlanEditor({ lines, plan, eventDate, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(() => draftOf(plan));
  const [comment, setComment] = useState("");
  const remaining = remainingByLine(lines, draft);
  const today = new Date().toISOString().slice(0, 10);
  const set = (key, patch) => setDraft((d) => d.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const setQty = (b, line, value) => setDraft((d) => {
    const max = maxForBatchLine(line, d, b.key);
    const next = clampBatchQty(value, max);
    return d.map((x) => (x.key === b.key ? { ...x, qty: { ...x.qty, [line.id]: next } } : x));
  });
  const add = () => setDraft((d) => [...d, { key: `n${Date.now()}`, slip_id: null, batch_number: null, needed_by_date: eventDate || "", qty: {} }]);
  const balanced = [...remaining.values()].every((v) => v === 0);
  const filled = draft.length > 0 && draft.every((b) => b.needed_by_date && Object.values(b.qty).some((v) => Number(v) > 0));

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">Propose a batch plan</p>
      {draft.map((b, i) => (
        <div key={b.key} className="rounded-md bg-muted/40 p-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{b.batch_number ? `Batch ${b.batch_number}` : `New batch ${i + 1}`}</span>
            <Input type="date" className="h-8 w-40" min={today} max={eventDate} value={b.needed_by_date} onChange={(e) => set(b.key, { needed_by_date: e.target.value })} />
            <Button size="icon" variant="ghost" className="ml-auto" disabled={draft.length < 2} onClick={() => setDraft((d) => d.filter((x) => x.key !== b.key))}><Trash2 className="w-4 h-4 text-danger-600" /></Button>
          </div>
          {lines.map((l) => {
            const max = maxForBatchLine(l, draft, b.key);
            return (
              <div key={l.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{l.inventory_item_name}</span>
                <span className="flex items-center gap-1">
                  <Input type="number" min="0" max={max} step="any" className="h-7 w-24" value={b.qty[l.id] ?? ""} onChange={(e) => setQty(b, l, e.target.value)} />
                  <span className="w-10 text-muted-foreground">{l.unit}</span>
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <Button size="sm" variant="outline" className="gap-1.5" onClick={add}><Plus className="w-4 h-4" /> Add batch</Button>
      <BatchRemaining lines={lines} remaining={remaining} />
      <Textarea placeholder="Comment for the other side (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" className="gap-1.5" disabled={busy || !balanced || !filled} onClick={() => onSubmit(payloadOf(draft), comment)}><Send className="w-4 h-4" /> Send proposal</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      {(!balanced || !filled) && <p className="text-xs text-muted-foreground">Every line's batches must add up to its agreed quantity, and every batch needs a date and at least one quantity.</p>}
    </div>
  );
}