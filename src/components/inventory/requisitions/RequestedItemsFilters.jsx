import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["submitted", "replied", "confirmed", "pending_approval", "scheduled", "fulfilled", "rejected", "cancelled"];

export default function RequestedItemsFilters({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={value.status} onValueChange={(status) => set({ status })}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input className="w-56" placeholder="Event name…" value={value.event} onChange={(e) => set({ event: e.target.value })} />
      <Input type="date" className="w-44" value={value.date} onChange={(e) => set({ date: e.target.value })} />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <Switch checked={value.mine} onCheckedChange={(mine) => set({ mine })} /> Awaiting me
      </label>
    </div>
  );
}