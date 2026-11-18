import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PREP_STAGES } from "./prepStages";

export default function BatchEditDialog({ batch, employees, onClose, onSaved }) {
  const [staff, setStaff] = useState(batch.assigned_staff || []);
  const [stage, setStage] = useState(batch.prep_stage || "queued");
  const [notes, setNotes] = useState(batch.prep_notes || "");
  const [handoffTo, setHandoffTo] = useState(batch.handoff_to || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (e) => setStaff((s) => s.some((x) => x.employee_id === e.id)
    ? s.filter((x) => x.employee_id !== e.id) : [...s, { employee_id: e.id, name: e.name }]);

  const save = async () => {
    if (stage === "handed_off" && !handoffTo.trim()) return setError("Enter who received the batch.");
    setSaving(true);
    const me = await base44.auth.me();
    const patch = { assigned_staff: staff, prep_stage: stage, prep_notes: notes, handoff_to: handoffTo.trim(), prep_updated_by: me.email };
    if (stage === "handed_off" && batch.prep_stage !== "handed_off") Object.assign(patch, { handoff_by: me.email, handoff_date: new Date().toISOString() });
    await base44.entities.ProductionOrder.update(batch.id, patch);
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{batch.output_item_name || batch.recipe_name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Assigned staff</Label>
            <div className="mt-2 max-h-44 overflow-y-auto border rounded-md p-2 space-y-1">
              {employees.length === 0 && <p className="text-sm text-muted-foreground">No active staff found.</p>}
              {employees.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                  <Checkbox checked={staff.some((x) => x.employee_id === e.id)} onCheckedChange={() => toggle(e)} />
                  {e.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{PREP_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(stage === "ready" || stage === "handed_off") && (
            <div>
              <Label>Handed off to</Label>
              <Input className="mt-1" value={handoffTo} onChange={(e) => setHandoffTo(e.target.value)} placeholder="e.g. Service team / driver name" />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}