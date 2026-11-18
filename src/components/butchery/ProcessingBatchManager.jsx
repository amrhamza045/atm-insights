import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BATCH_STATUS_CONFIG, ALLOCATION_METHODS, generateBatchNumber, fmtMoney, fmtNum } from "./shared";
import { logSuccess } from "@/components/utils/auditLogHelper";

export default function ProcessingBatchManager() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const queryClient = useQueryClient();
  const { selectedBranchId, selectedBranch } = useBranch();

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["processingBatches", selectedBranchId],
    queryFn: () => base44.entities.ProcessingBatch.filter(
      selectedBranchId ? { branch_id: selectedBranchId } : {}, "-created_date"
    ),
  });

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4" /> New Batch
        </Button>
      </div>
      {batches.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No processing batches yet.</Card>
      ) : (
        <div className="grid gap-2">
          {batches.map((b) => {
            const cfg = BATCH_STATUS_CONFIG[b.status] || BATCH_STATUS_CONFIG.open;
            const shared = (b.labor_cost || 0) + (b.overhead_cost || 0) + (b.disposal_cost || 0);
            return (
              <Card key={b.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetail(b)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900">{b.batch_number}</h4>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>{b.animal_count || (b.animal_ids || []).length} animal(s)</span>
                      <span>Shared cost: {fmtMoney(shared)}</span>
                      <span className="capitalize">Method: {b.cost_allocation_method || "weight"}</span>
                      {b.date && <span>{b.date}</span>}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(b); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {showForm && (
        <BatchForm
          batch={editing}
          branchId={selectedBranchId}
          branchName={selectedBranch?.name}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ["processingBatches"] }); }}
        />
      )}
      {detail && (
        <BatchDetail batch={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

function BatchForm({ batch, branchId, branchName, onClose, onSaved }) {
  const [form, setForm] = useState({
    batch_number: generateBatchNumber(), date: new Date().toISOString().slice(0, 10),
    labor_cost: "", overhead_cost: "", disposal_cost: "", cost_allocation_method: "weight",
    status: "open", notes: "", branch_id: branchId || null, branch_name: branchName || null, ...batch,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.batch_number) return toast.error("Batch number is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        labor_cost: Number(form.labor_cost) || 0,
        overhead_cost: Number(form.overhead_cost) || 0,
        disposal_cost: Number(form.disposal_cost) || 0,
        total_shared_cost: (Number(form.labor_cost) || 0) + (Number(form.overhead_cost) || 0) + (Number(form.disposal_cost) || 0),
        branch_id: branchId || null,
        branch_name: branchName || null,
      };
      if (batch?.id) await base44.entities.ProcessingBatch.update(batch.id, payload);
      else await base44.entities.ProcessingBatch.create(payload);
      logSuccess(batch?.id ? "update" : "create", "ProcessingBatch", `Batch ${form.batch_number}`, { entityId: batch?.id });
      toast.success(batch?.id ? "Batch updated" : "Batch created");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{batch?.id ? "Edit Batch" : "New Processing Batch"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Batch Number</Label><Input value={form.batch_number} onChange={(e) => set("batch_number", e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Labor Cost</Label><Input type="number" step="0.01" value={form.labor_cost} onChange={(e) => set("labor_cost", e.target.value)} /></div>
            <div><Label>Overhead</Label><Input type="number" step="0.01" value={form.overhead_cost} onChange={(e) => set("overhead_cost", e.target.value)} /></div>
            <div><Label>Disposal</Label><Input type="number" step="0.01" value={form.disposal_cost} onChange={(e) => set("disposal_cost", e.target.value)} /></div>
          </div>
          <div><Label>Cost Allocation Method</Label>
            <Select value={form.cost_allocation_method} onValueChange={(v) => set("cost_allocation_method", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ALLOCATION_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

function BatchDetail({ batch, onClose }) {
  const { data: animals = [] } = useQuery({
    queryKey: ["batchAnimals", batch.id],
    queryFn: () => base44.entities.Animal.filter({ processing_batch_id: batch.id }),
  });
  const shared = (batch.labor_cost || 0) + (batch.overhead_cost || 0) + (batch.disposal_cost || 0);

  const assignAnimal = async (animalId) => {
    if (!animalId) return;
    const animal = animals.find((a) => a.id === animalId);
    await base44.entities.Animal.update(animalId, { processing_batch_id: batch.id });
    const existing = batch.animal_ids || [];
    await base44.entities.ProcessingBatch.update(batch.id, {
      animal_ids: [...existing, animalId],
      animal_count: (existing.length + 1),
    });
    toast.success("Animal added to batch");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Batch {batch.batch_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <p className="text-slate-600">Date: <strong>{batch.date || "—"}</strong></p>
            <p className="text-slate-600">Shared costs: Labor {fmtMoney(batch.labor_cost)} · Overhead {fmtMoney(batch.overhead_cost)} · Disposal {fmtMoney(batch.disposal_cost)}</p>
            <p className="text-slate-600 font-medium">Total shared: {fmtMoney(shared)}</p>
            <p className="text-slate-600 capitalize">Allocation: {batch.cost_allocation_method || "weight"}-based</p>
          </div>
          <div>
            <Label>Animals in batch ({animals.length})</Label>
            {animals.length === 0 ? (
              <p className="text-xs text-slate-400 mt-1">No animals assigned yet.</p>
            ) : (
              <div className="space-y-1 mt-1">
                {animals.map((a) => (
                  <div key={a.id} className="text-xs bg-slate-50 rounded px-2 py-1.5 flex justify-between">
                    <span>#{a.tag_number} — {a.species}</span>
                    <span>{fmtNum(a.live_weight)} kg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <BatchAnimalAssigner batch={batch} onAssigned={() => {}} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BatchAnimalAssigner({ batch, onAssigned }) {
  const [animalId, setAnimalId] = useState("");
  const { data: allAnimals = [] } = useQuery({
    queryKey: ["animals"],
    queryFn: () => base44.entities.Animal.list("-created_date"),
  });
  const available = allAnimals.filter((a) => !a.processing_batch_id || a.processing_batch_id === batch.id);

  return (
    <div>
      <Label>Add animal to batch</Label>
      <Select value={animalId} onValueChange={setAnimalId}>
        <SelectTrigger><SelectValue placeholder="Select an alive animal" /></SelectTrigger>
        <SelectContent>
          {available.filter((a) => a.status === "alive" || a.status === "scheduled_slaughter").map((a) => (
            <SelectItem key={a.id} value={a.id}>#{a.tag_number} ({a.species}, {fmtNum(a.live_weight)} kg)</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {animalId && (
        <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700" onClick={() => { onAssigned(animalId); setAnimalId(""); }}>
          Assign
        </Button>
      )}
    </div>
  );
}