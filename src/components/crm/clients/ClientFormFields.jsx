import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PhoneField from "@/components/shared/PhoneField";

function Pick({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ClientFormFields({ form, setForm }) {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="client-name">Name *</Label>
        <Input id="client-name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Pick label="Client type" value={form.client_type} onChange={(client_type) => set({ client_type })}
          options={[["individual", "Individual"], ["corporate", "Corporate"]]} />
        <Pick label="Status" value={form.status} onChange={(status) => set({ status })}
          options={[["active", "Active"], ["inactive", "Inactive"], ["pending", "Pending"]]} />
      </div>
      <PhoneField value={form.phone} onChange={(phone) => set({ phone })} />
      <div className="space-y-1.5">
        <Label htmlFor="client-email">Email</Label>
        <Input id="client-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-address">Address</Label>
        <Input id="client-address" value={form.address} onChange={(e) => set({ address: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-credit">Catering credit limit</Label>
        <Input id="client-credit" type="number" min="0" step="0.01" value={form.catering_credit_limit}
          onChange={(e) => set({ catering_credit_limit: e.target.value })} />
        <p className="text-xs text-slate-500">0 means no limit is checked when quoting.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="client-notes">Notes</Label>
        <Textarea id="client-notes" rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
    </div>
  );
}