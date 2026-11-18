import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CUSTODY_LABELS, confirmerLabel } from "./custodyMeta";

export default function CustodyConfirmDialog({ open, onOpenChange, trip, stage, onDone, issueMode = false }) {
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes("");
      setPhotoFile(null);
      setItems(
        (trip.checklist || []).map((i) => ({
          item_key: i.item_key || "",
          item_name: i.label,
          expected_quantity: Number(i.quantity) || 0,
          actual_quantity: Number(i.quantity) || 0,
          unit: i.unit || "",
        }))
      );
    }
  }, [open, trip]);

  const setActual = (idx, v) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, actual_quantity: Number(v) } : it)));

  const short = items.filter((i) => Number(i.actual_quantity) < Number(i.expected_quantity));

  const submit = async () => {
    setSaving(true);
    try {
      let photo_url = "";
      if (photoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: photoFile });
        photo_url = file_url;
      }
      const res = await base44.functions.invoke("createCustodyCheckpoint", {
        trip_id: trip.id,
        stage,
        item_details: items,
        discrepancy_notes: notes,
        photo_url,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(res.data?.status === "shortage" ? "Confirmed with a shortage — logged against the handover" : "Checkpoint confirmed");
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Could not confirm the checkpoint");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {issueMode ? "Report an issue" : "Confirm"}: {stage ? CUSTODY_LABELS[stage] : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Expected confirmer: <span className="font-medium text-slate-700">{stage ? confirmerLabel(stage, trip) : ""}</span>. Adjust any count that doesn't match — a shortfall is flagged automatically.
          </p>

          {items.length === 0 ? (
            <p className="text-xs text-slate-400">This trip has no checklist items yet.</p>
          ) : (
            <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
              {items.map((it, idx) => {
                const isShort = Number(it.actual_quantity) < Number(it.expected_quantity);
                return (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                    <span className="min-w-0 flex-1 truncate text-slate-700">{it.item_name}</span>
                    <span className="text-slate-400 shrink-0">of {it.expected_quantity} {it.unit}</span>
                    <Input
                      type="number"
                      min="0"
                      className={`w-20 h-7 text-xs ${isShort ? "border-red-400 text-red-600" : ""}`}
                      value={it.actual_quantity}
                      onChange={(e) => setActual(idx, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className={`rounded-lg border p-2.5 space-y-2 ${short.length > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
            {short.length > 0 && (
              <p className="text-xs font-medium text-red-700">
                {short.length} item(s) short — this checkpoint will be recorded as a shortage.
              </p>
            )}
            <div>
              <Label className="text-xs">{issueMode ? "What is the issue?" : "Report an issue (optional)"}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="bg-white" placeholder="Anything short, damaged or wrong…" />
            </div>
            <div>
              <Label className="text-xs">{issueMode ? "Photo evidence — upload or take a picture" : "Photo evidence (optional) — upload or take a picture"}</Label>
              <Input type="file" accept="image/*" capture="environment" className="bg-white" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
              {photoFile && <p className="text-xs text-slate-500 mt-1">{photoFile.name}</p>}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            This confirmation is permanent. Your name and the time are recorded, along with whoever handed the items over.
          </p>

          <Button
            className="w-full"
            variant={issueMode ? "destructive" : "default"}
            onClick={submit}
            disabled={saving || (issueMode && !notes.trim())}
          >
            {saving
              ? "Saving…"
              : issueMode
                ? "Submit issue report"
                : short.length > 0
                  ? "Confirm with shortage"
                  : "Confirm checkpoint"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}