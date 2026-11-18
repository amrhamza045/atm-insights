import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "./shared";

const CATEGORIES = ["fodder", "medicine", "veterinary", "other"];

const CATEGORY_STYLES = {
  fodder: "bg-amber-100 text-amber-700",
  medicine: "bg-blue-100 text-blue-700",
  veterinary: "bg-purple-100 text-purple-700",
  other: "bg-slate-100 text-slate-600",
};

const CATEGORY_LABEL = (c) => c.charAt(0).toUpperCase() + c.slice(1);

export default function ExpenseManager() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["butcheryExpenses"],
    queryFn: () => base44.entities.ButcheryExpense.list("-date"),
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.ButcheryExpense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["butcheryExpenses"] }); toast.success("Expense deleted"); },
  });

  const filtered = filterCat === "all" ? expenses : expenses.filter((e) => e.category === filterCat);
  const total = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL(c)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Total: <span className="font-semibold text-slate-900">{fmtMoney(total)}</span></span>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4" /> Add Expense
          </Button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-slate-400">No expenses recorded yet.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <Card key={e.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[e.category] || CATEGORY_STYLES.other}`}>
                  {CATEGORY_LABEL(e.category)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{e.description || e.category}</p>
                  <p className="text-xs text-slate-500">
                    {e.date}{e.vendor_name ? ` · ${e.vendor_name}` : ""}{e.animal_tag ? ` · ${e.animal_tag}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-900">{fmtMoney(Number(e.amount) || 0)}</span>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="text-red-600" onClick={() => { if (confirm("Delete expense?")) del.mutate(e.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {showForm && (
        <ExpenseForm
          expense={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ["butcheryExpenses"] }); }}
        />
      )}
    </div>
  );
}

function ExpenseForm({ expense, onClose, onSaved }) {
  const [form, setForm] = useState({
    category: "fodder",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    weight: "",
    cost_per_kg: "",
    vendor_name: "",
    animal_tag: "",
    notes: "",
    ...expense,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  const { data: animals = [] } = useQuery({
    queryKey: ["butcheryAnimals"],
    queryFn: () => base44.entities.Animal.list("tag_number"),
  });

  // Auto-calculate total amount when weight & cost_per_kg are present
  const weightNum = Number(form.weight) || 0;
  const costNum = Number(form.cost_per_kg) || 0;
  const autoAmount = weightNum > 0 && costNum > 0 ? (weightNum * costNum).toFixed(2) : "";

  const handleSave = async () => {
    const finalAmount = autoAmount !== "" ? Number(autoAmount) : (Number(form.amount) || 0);
    if (!form.date || !finalAmount) return toast.error("Date and amount are required");
    if (!form.animal_tag) return toast.error("Animal tag is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: finalAmount,
        weight: form.weight ? Number(form.weight) : undefined,
        cost_per_kg: form.cost_per_kg ? Number(form.cost_per_kg) : undefined,
      };
      if (expense?.id) await base44.entities.ButcheryExpense.update(expense.id, payload);
      else await base44.entities.ButcheryExpense.create(payload);
      toast.success(expense?.id ? "Expense updated" : "Expense added");
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{expense?.id ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Related Animal Tag *</Label>
            <Select value={form.animal_tag || "__none__"} onValueChange={(v) => {
              const tag = v === "__none__" ? "" : v;
              const animal = animals.find((a) => a.tag_number === tag);
              setForm({ ...form, animal_tag: tag, animal_id: animal?.id || "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Select animal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {animals.map((a) => (
                  <SelectItem key={a.id} value={a.tag_number}>
                    {a.tag_number} ({a.species}{a.breed ? `, ${a.breed}` : ""})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL(c)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
          {form.category === "fodder" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Weight (kg)</Label><Input type="number" step="0.01" value={form.weight || ""} onChange={(e) => set("weight", e.target.value)} placeholder="0" /></div>
              <div><Label>Cost per kg</Label><Input type="number" step="0.01" value={form.cost_per_kg || ""} onChange={(e) => set("cost_per_kg", e.target.value)} placeholder="0" /></div>
            </div>
          )}
          <div><Label>Total Cost *</Label>
            <Input
              type="number"
              step="0.01"
              value={autoAmount !== "" ? autoAmount : (form.amount || "")}
              onChange={(e) => set("amount", e.target.value)}
              placeholder={autoAmount === "" ? "Enter total or fill weight & cost/kg" : ""}
              readOnly={autoAmount !== ""}
              className={autoAmount !== "" ? "bg-slate-50 text-slate-600" : ""}
            />
            {autoAmount !== "" && <p className="text-xs text-slate-400 mt-1">Auto-calculated from weight × cost/kg</p>}
          </div>
          <div><Label>Vendor / Provider</Label><Input value={form.vendor_name || ""} onChange={(e) => set("vendor_name", e.target.value)} placeholder="Supplier or vet name" /></div>
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