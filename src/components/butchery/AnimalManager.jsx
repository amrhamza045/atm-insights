import React, { useState, useMemo } from "react";
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
import { Plus, Loader2, Pencil, Skull } from "lucide-react";
import { toast } from "sonner";
import { ANIMAL_STATUS_CONFIG, SPECIES_OPTIONS, SEX_OPTIONS, SPECIES_ICONS, SPECIES_IMAGES, SPECIES_LABELS, fmtMoney, fmtNum } from "./shared";
import { logSuccess } from "@/components/utils/auditLogHelper";

export default function AnimalManager() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [closing, setClosing] = useState(null);
  const queryClient = useQueryClient();

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ["animals"],
    queryFn: () => base44.entities.Animal.list("-created_date"),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["butcherySuppliers"],
    queryFn: () => base44.entities.ButcherySupplier.list("name"),
  });

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Register Animal
        </Button>
      </div>
      {animals.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No animals registered yet.</Card>
      ) : (
        <div className="grid gap-2">
          {animals.map((a) => {
            const cfg = ANIMAL_STATUS_CONFIG[a.status] || ANIMAL_STATUS_CONFIG.alive;
            return (
              <Card key={a.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900">#{a.tag_number}</h4>
                      <Badge className={cfg.color}>{cfg.label}</Badge>
                      {a.loss_booked && <Badge className="bg-red-50 text-red-600">Loss Booked</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="capitalize">{a.species}</span>
                      {a.breed && <span>{a.breed}</span>}
                      <span>{fmtNum(a.live_weight)} {a.weight_unit || "kg"}</span>
                      {a.purchase_cost > 0 && <span className="font-medium text-slate-700">{fmtMoney(a.purchase_cost)}</span>}
                      {a.supplier_name && <span>via {a.supplier_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {(a.status === "alive" || a.status === "scheduled_slaughter") && (
                      <Button size="sm" variant="outline" className="text-red-600 gap-1" onClick={() => setClosing(a)}>
                        <Skull className="w-3 h-3" /> Close
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {showForm && (
        <AnimalForm
          animal={editing}
          suppliers={suppliers}
          animals={animals}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ["animals"] }); }}
        />
      )}
      {closing && (
        <CloseAnimalDialog
          animal={closing}
          onClose={() => setClosing(null)}
          onSaved={() => { setClosing(null); queryClient.invalidateQueries({ queryKey: ["animals"] }); }}
        />
      )}
    </div>
  );
}

function AnimalForm({ animal, suppliers, animals = [], onClose, onSaved }) {
  const nextTagNumber = useMemo(() => {
    if (animal?.id) return animal.tag_number || "";
    let maxNum = 0;
    (animals || []).forEach((a) => {
      const match = (a.tag_number || "").match(/^ANI(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `ANI${maxNum + 1}`;
  }, [animal, animals]);

  const [form, setForm] = useState({
    tag_number: nextTagNumber, species: "cattle", breed: "", sex: "unknown", supplier_id: "", date_received: new Date().toISOString().slice(0, 10),
    live_weight: "", weight_unit: "kg", purchase_cost: "", notes: "", ...animal,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSave = async () => {
    if (!form.tag_number) return toast.error("Tag number is required");
    if (!form.live_weight) return toast.error("Live weight is required");
    const supplier = suppliers.find((s) => s.id === form.supplier_id);
    const payload = {
      ...form,
      live_weight: Number(form.live_weight),
      purchase_cost: Number(form.purchase_cost) || 0,
      supplier_name: supplier?.name || "",
    };
    setSaving(true);
    try {
      if (animal?.id) await base44.entities.Animal.update(animal.id, payload);
      else await base44.entities.Animal.create(payload);
      logSuccess(animal?.id ? "update" : "create", "Animal", `Animal #${form.tag_number}`, { entityId: animal?.id });
      toast.success(animal?.id ? "Animal updated" : "Animal registered");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{animal?.id ? "Edit Animal" : "Register Animal"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tag Number *</Label><Input value={form.tag_number} onChange={(e) => set("tag_number", e.target.value)} readOnly={!animal?.id} className={!animal?.id ? "bg-slate-50 text-slate-500 font-medium" : ""} /></div>
            <div><Label>Species</Label>
              <Select value={form.species} onValueChange={(v) => set("species", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIES_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      <span className="flex items-center gap-2">
                        {SPECIES_IMAGES[s] ? (
                          <img src={SPECIES_IMAGES[s]} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          <span className="text-base">{SPECIES_ICONS[s]}</span>
                        )}
                        <span>{SPECIES_LABELS[s]}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Breed</Label><Input value={form.breed || ""} onChange={(e) => set("breed", e.target.value)} /></div>
            <div><Label>Sex</Label>
              <Select value={form.sex} onValueChange={(v) => set("sex", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEX_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Supplier</Label>
            <Select value={form.supplier_id || ""} onValueChange={(v) => set("supplier_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date Received</Label><Input type="date" value={form.date_received || ""} onChange={(e) => set("date_received", e.target.value)} /></div>
            <div><Label>Live Weight (kg) *</Label>
              <div className="relative">
                <Input type="number" step="0.01" value={form.live_weight} onChange={(e) => set("live_weight", e.target.value)} className="pr-10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">kg</span>
              </div>
            </div>
          </div>
          <div><Label>Purchase Cost</Label><Input type="number" step="0.01" value={form.purchase_cost} onChange={(e) => set("purchase_cost", e.target.value)} /></div>
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

function CloseAnimalDialog({ animal, onClose, onSaved }) {
  const [status, setStatus] = useState("deceased_pre_slaughter");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleClose = async () => {
    if (!reason) return toast.error("Please provide a closure reason");
    setSaving(true);
    try {
      await base44.entities.Animal.update(animal.id, {
        status, closure_reason: reason, loss_booked: true,
      });
      logSuccess("update", "Animal", `Closed animal #${animal.tag_number} as ${status} — loss booked`, { entityId: animal.id });
      toast.success("Animal closed — purchase cost booked as full loss");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Close Animal #{animal.tag_number}</DialogTitle>
          <DialogDescription>
            Closing books the purchase cost ({fmtMoney(animal.purchase_cost)}) as a full loss. The record is preserved for traceability.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Closure Type</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deceased_pre_slaughter">Deceased (Pre-slaughter)</SelectItem>
                <SelectItem value="rejected_returned">Rejected / Returned to Supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Reason *</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explain what happened..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleClose} disabled={saving} className="bg-red-600 hover:bg-red-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close & Book Loss"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}