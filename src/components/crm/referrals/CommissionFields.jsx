import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import EventPicker from "./EventPicker";

export default function CommissionFields({ form, setForm, options, eventsLoading }) {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Event that earns it *</Label>
        <EventPicker value={form.event_id} options={options} loading={eventsLoading} onChange={(event_id) => set({ event_id })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="commission-amount">Commission amount *</Label>
        <Input id="commission-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="0.00" />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
        <Label htmlFor="commission-paid">Paid to the referrer</Label>
        <Switch id="commission-paid" checked={form.paid} onCheckedChange={(paid) => set({ paid })} />
      </div>
      {form.paid && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="commission-paid-date">Paid on</Label>
            <Input id="commission-paid-date" type="date" value={form.paid_date} onChange={(e) => set({ paid_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="commission-reference">Payment reference</Label>
            <Input id="commission-reference" value={form.payment_reference} onChange={(e) => set({ payment_reference: e.target.value })} placeholder="e.g. InstaPay ref" />
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="commission-notes">Notes</Label>
        <Textarea id="commission-notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
    </div>
  );
}