import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

export default function SupplierManager() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["butcherySuppliers"],
    queryFn: () => base44.entities.ButcherySupplier.list("name"),
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.ButcherySupplier.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["butcherySuppliers"] }); toast.success("Supplier deleted"); },
  });

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>
      {suppliers.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No suppliers yet. Add one to start tracking animals.</Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="p-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h4 className="font-medium text-slate-900 truncate">{s.name}</h4>
                  {s.phone && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</p>}
                  {s.email && <p className="text-xs text-slate-500 flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{s.email}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Delete supplier?")) del.mutate(s.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showForm && (
        <SupplierForm
          supplier={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ["butcherySuppliers"] }); }}
        />
      )}
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "", notes: "", ...supplier });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSave = async () => {
    if (!form.name) return toast.error("Name is required");
    setSaving(true);
    try {
      if (supplier?.id) await base44.entities.ButcherySupplier.update(supplier.id, form);
      else await base44.entities.ButcherySupplier.create(form);
      toast.success(supplier?.id ? "Supplier updated" : "Supplier created");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{supplier?.id ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={form.name} onChange={set("name")} /></div>
          <div><Label>Phone</Label><Input value={form.phone || ""} onChange={set("phone")} /></div>
          <div><Label>Email</Label><Input value={form.email || ""} onChange={set("email")} /></div>
          <div><Label>Address</Label><Input value={form.address || ""} onChange={set("address")} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={set("notes")} rows={2} /></div>
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