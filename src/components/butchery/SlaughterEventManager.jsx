import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Loader2, Calculator, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { CONDEMNATION_CONFIG, fmtMoney, fmtNum, pct } from "./shared";
import { logSuccess } from "@/components/utils/auditLogHelper";

export default function SlaughterEventManager() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["slaughterEvents"],
    queryFn: () => base44.entities.SlaughterEvent.list("-created_date"),
  });

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4" /> New Slaughter Event
        </Button>
      </div>
      {events.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No slaughter events recorded yet.</Card>
      ) : (
        <div className="grid gap-2">
          {events.map((e) => {
            const cfg = CONDEMNATION_CONFIG[e.condemnation_type] || CONDEMNATION_CONFIG.none;
            return (
              <Card key={e.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium text-slate-900">#{e.animal_tag || "—"}</h4>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                      {e.cost_allocated && <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="w-3 h-3" /> Costed</Badge>}
                      {e.reconciliation_status === "warning" && <Badge className="bg-warning-100 text-warning-700 gap-1"><AlertTriangle className="w-3 h-3" /> Variance</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {e.hot_carcass_weight != null && <span>Hot: {fmtNum(e.hot_carcass_weight)} kg</span>}
                      {e.cold_carcass_weight != null && <span>Cold: {fmtNum(e.cold_carcass_weight)} kg</span>}
                      <span>Dressing: {pct(e.dressing_percentage)}</span>
                      {e.total_cost > 0 && <span className="font-medium text-slate-700">Cost: {fmtMoney(e.total_cost)}</span>}
                      {e.net_cost_to_allocate > 0 && <span>Net: {fmtMoney(e.net_cost_to_allocate)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!e.cost_allocated && (
                      <AllocateButton eventId={e.id} onDone={() => queryClient.invalidateQueries({ queryKey: ["slaughterEvents"] })} />
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {showForm && (
        <SlaughterForm
          event={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ["slaughterEvents"] }); }}
        />
      )}
    </div>
  );
}

function AllocateButton({ eventId, onDone }) {
  const [loading, setLoading] = useState(false);
  const handleAllocate = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("allocateButcheryCosts", { slaughter_event_id: eventId });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Costs allocated — Net: ${fmtMoney(res.data.net_cost_to_allocate)}`);
      onDone();
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  return (
    <Button size="sm" onClick={handleAllocate} disabled={loading} className="gap-1 bg-red-600 hover:bg-red-700">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calculator className="w-3 h-3" />} Allocate
    </Button>
  );
}

function SlaughterForm({ event, onClose, onSaved }) {
  const { data: animals = [] } = useQuery({
    queryKey: ["animals"],
    queryFn: () => base44.entities.Animal.list("-created_date"),
  });
  const { data: batches = [] } = useQuery({
    queryKey: ["processingBatches"],
    queryFn: () => base44.entities.ProcessingBatch.list("-created_date"),
  });

  const [animalId, setAnimalId] = useState(event?.animal_id || "");
  const [batchId, setBatchId] = useState(event?.processing_batch_id || "");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    hot_carcass_weight: "", cold_carcass_weight: "", disposal_cost: "",
    condemnation_type: "none", condemnation_note: "", notes: "",
    ...event,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const selectedAnimal = animals.find((a) => a.id === animalId);

  const handleSave = async () => {
    if (!animalId) return toast.error("Select an animal");
    const animal = selectedAnimal;
    const batch = batches.find((b) => b.id === batchId);
    const payload = {
      ...form,
      animal_id: animalId,
      animal_tag: animal?.tag_number || "",
      processing_batch_id: batchId || null,
      batch_number: batch?.batch_number || "",
      hot_carcass_weight: Number(form.hot_carcass_weight) || 0,
      cold_carcass_weight: Number(form.cold_carcass_weight) || 0,
      disposal_cost: Number(form.disposal_cost) || 0,
    };
    setSaving(true);
    try {
      let saved;
      if (event?.id) saved = await base44.entities.SlaughterEvent.update(event.id, payload);
      else saved = await base44.entities.SlaughterEvent.create(payload);
      // Mark animal as slaughtered if not condemned to death
      if (!event?.id && form.condemnation_type !== "full") {
        await base44.entities.Animal.update(animalId, { status: "slaughtered" });
      }
      logSuccess(event?.id ? "update" : "create", "SlaughterEvent", `Slaughter for #${animal?.tag_number}`, { entityId: saved?.id });
      toast.success(event?.id ? "Event updated" : "Slaughter event created");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{event?.id ? "Edit Slaughter Event" : "New Slaughter Event"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Animal *</Label>
            <Select value={animalId} onValueChange={setAnimalId} disabled={!!event?.id}>
              <SelectTrigger><SelectValue placeholder="Select animal" /></SelectTrigger>
              <SelectContent>
                {animals.filter((a) => a.status === "alive" || a.status === "scheduled_slaughter" || a.id === animalId).map((a) => (
                  <SelectItem key={a.id} value={a.id}>#{a.tag_number} ({a.species}, {fmtNum(a.live_weight)} kg)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedAnimal && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
              <p>Live weight: <strong>{fmtNum(selectedAnimal.live_weight)} kg</strong></p>
              <p>Purchase cost: <strong>{fmtMoney(selectedAnimal.purchase_cost)}</strong></p>
            </div>
          )}
          <div><Label>Processing Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger><SelectValue placeholder="Optional — select batch" /></SelectTrigger>
              <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.batch_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Hot Carcass Weight</Label><Input type="number" step="0.01" value={form.hot_carcass_weight} onChange={(e) => set("hot_carcass_weight", e.target.value)} /></div>
            <div><Label>Cold Carcass Weight</Label><Input type="number" step="0.01" value={form.cold_carcass_weight} onChange={(e) => set("cold_carcass_weight", e.target.value)} /></div>
          </div>
          <div><Label>Disposal Cost</Label><Input type="number" step="0.01" value={form.disposal_cost} onChange={(e) => set("disposal_cost", e.target.value)} /></div>
          <div><Label>Condemnation</Label>
            <Select value={form.condemnation_type} onValueChange={(v) => set("condemnation_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="full">Full Condemnation</SelectItem>
                <SelectItem value="partial">Partial Condemnation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.condemnation_type !== "none" && (
            <div><Label>Condemnation Note</Label><Textarea value={form.condemnation_note || ""} onChange={(e) => set("condemnation_note", e.target.value)} rows={2} /></div>
          )}
          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}