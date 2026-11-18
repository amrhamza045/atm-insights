import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["dietary", "allergy", "accessibility", "beverage", "other"];

export default function SpecialRequestsEditor({ requests = [], onChange }) {
  const update = (idx, patch) => onChange(requests.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {requests.map((r, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Select value={r.category || "dietary"} onValueChange={(v) => update(idx, { category: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="flex-1"
              placeholder="Requirement (e.g. 4 gluten-free mains)"
              value={r.detail || ""}
              onChange={(e) => update(idx, { detail: e.target.value })}
            />
            <Button variant="ghost" size="icon" onClick={() => onChange(requests.filter((_, i) => i !== idx))}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div><Label className="text-xs">Guest / table</Label><Input value={r.guest_reference || ""} onChange={(e) => update(idx, { guest_reference: e.target.value })} /></div>
            <div><Label className="text-xs">Guests covered</Label><Input type="number" min="0" value={r.guest_count ?? ""} onChange={(e) => update(idx, { guest_count: Number(e.target.value) || 0 })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={!!r.kitchen_critical} onCheckedChange={(v) => update(idx, { kitchen_critical: v })} />
              <Label className="text-xs">Kitchen critical</Label>
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => onChange([...requests, { category: "dietary", detail: "", kitchen_critical: false }])}
      >
        <Plus className="w-4 h-4" /> Add special request
      </Button>
    </div>
  );
}