import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import ReturnedItemPicker from "./ReturnedItemPicker";

const EMPTY = {
  item_name: "",
  inventory_item_id: "",
  received: 0,
  category: "food",
  quantity: "",
  unit: "",
  unit_cost: "",
  condition: "reusable",
  disposition: "pending",
  notes: "",
};

export default function ReturnedItemForm({ event, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.inventory_item_id || !(Number(form.quantity) > 0)) {
      toast.error("Pick an item the event received and enter the quantity");
      return;
    }
    setSaving(true);
    const qty = Number(form.quantity) || 0;
    const cost = Number(form.unit_cost) || 0;
    const user = await base44.auth.me();
    await base44.entities.CateringReturnedItem.create({
      branch_id: event.branch_id,
      branch_name: event.branch_name,
      event_id: event.id,
      event_name: event.event_name,
      event_date: event.event_date,
      item_name: form.item_name.trim(),
      inventory_item_id: form.inventory_item_id,
      category: form.category,
      quantity: qty,
      unit: form.unit,
      unit_cost: cost,
      total_value: Math.round(qty * cost * 100) / 100,
      condition: form.condition,
      disposition: form.disposition,
      recorded_by: user?.email,
      notes: form.notes,
    });
    setSaving(false);
    setForm(EMPTY);
    toast.success("Returned item logged");
    onSaved?.();
  };

  return (
    <Card className="p-4 space-y-3">
      <div>
        <p className="font-semibold text-slate-900">Log unused item</p>
        <p className="text-xs text-slate-500">Only items made for or released to this event can be returned. Each is valued at the cost the event received it at.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2">
          <Label>Item</Label>
          <ReturnedItemPicker
            event={event}
            value={form.inventory_item_id}
            label={form.item_name}
            onSelect={(picked) => setForm((f) => ({ ...f, ...picked }))}
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="food">Food</SelectItem>
              <SelectItem value="beverage">Beverage</SelectItem>
              <SelectItem value="raw_material">Raw material</SelectItem>
              <SelectItem value="packaging">Packaging</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Quantity</Label>
            <Input type="number" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder={form.received ? `up to ${form.received}` : "2"} />
          </div>
          <div>
            <Label>Unit</Label>
            <Input value={form.unit} readOnly disabled placeholder="From the item" />
          </div>
        </div>
        <div>
          <Label>Cost per unit at the event (EGP)</Label>
          <Input value={form.unit_cost} readOnly disabled placeholder="From the item" />
        </div>
        <div>
          <Label>Condition</Label>
          <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reusable">Reusable</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
              <SelectItem value="spoiled">Spoiled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Disposition</Label>
          <Select value={form.disposition} onValueChange={(v) => set("disposition", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="returned_to_stock">Returned to stock</SelectItem>
              <SelectItem value="staff_meal">Staff meal</SelectItem>
              <SelectItem value="wasted">Wasted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="gap-1">
        <Plus className="w-4 h-4" /> {saving ? "Saving…" : "Add returned item"}
      </Button>
    </Card>
  );
}