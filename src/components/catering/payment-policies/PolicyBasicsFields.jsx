import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function PolicyBasicsFields({ form, set, error }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <Label htmlFor="policy-name">Policy name</Label>
          <Input id="policy-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Short notice" />
        </div>
        <label className="flex items-center gap-2 h-9 text-sm text-slate-700 cursor-pointer">
          <Switch checked={form.is_active} onCheckedChange={(on) => set({ is_active: on })} />
          Active
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="space-y-1.5">
        <Label htmlFor="policy-notes">Notes (optional)</Label>
        <Textarea
          id="policy-notes"
          rows={2}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Anything the team should know about this policy"
        />
      </div>
    </div>
  );
}