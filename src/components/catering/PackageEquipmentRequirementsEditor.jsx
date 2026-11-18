import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import EquipmentPicker from "./EquipmentPicker";

const blank = { equipment_id: "", equipment_name: "", scaling_mode: "flat", quantity: 1, per_guest_divisor: 1, notes: "" };

/** Plain-language description of what a row resolves to at event time. */
export function requirementSummary(row) {
  const qty = Number(row.quantity) || 0;
  if (!qty) return "Set a quantity";
  if (row.scaling_mode !== "per_guest") return `${qty} flat — same for every event size`;
  const divisor = Number(row.per_guest_divisor) || 0;
  if (divisor <= 0) return "Set how many guests one batch covers";
  return divisor === 1
    ? `${qty} per guest — 100 guests needs ${qty * 100}`
    : `${qty} per ${divisor} guests — 100 guests needs ${Math.ceil(100 / divisor) * qty}`;
}

export default function PackageEquipmentRequirementsEditor({ rows = [], onChange }) {
  const { data: equipment = [] } = useQuery({
    queryKey: ["catering-equipment-catalog"],
    queryFn: () => base44.entities.CateringEquipment.list("name", 500),
  });

  const set = (idx, patch) => onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 p-3">
          No equipment required — staff will plan equipment manually for events using this package. This section is
          optional: add rows only when the package always needs specific equipment, so it can be reserved automatically.
        </p>
      )}

      {rows.map((r, idx) => {
        const match = equipment.find((e) => e.id === r.equipment_id);
        const retired = !!r.equipment_id && equipment.length > 0 && (!match || match.is_active === false);
        return (
          <div key={idx} className={`rounded-lg border p-3 space-y-2 ${retired ? "border-warning-300 bg-warning-50" : "border-slate-200"}`}>
            <div className="flex items-center gap-2">
              <EquipmentPicker
                equipment={equipment}
                value={r.equipment_id}
                fallbackLabel={r.equipment_name}
                onChange={(item) => set(idx, { equipment_id: item.id, equipment_name: item.name })}
              />
              <Button variant="ghost" size="icon" onClick={() => onChange(rows.filter((_, i) => i !== idx))}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>

            {retired && (
              <Badge className="bg-warning-100 text-warning-800 gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Retired equipment — replace or remove this row
              </Badge>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
              <div>
                <Label className="text-xs">Scaling</Label>
                <Select value={r.scaling_mode || "flat"} onValueChange={(v) => set(idx, { scaling_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="per_guest">Per guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{r.scaling_mode === "per_guest" ? "Qty / batch" : "Qty"}</Label>
                <Input type="number" min="0" step="any" value={r.quantity} onChange={(e) => set(idx, { quantity: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Guests per batch</Label>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  disabled={r.scaling_mode !== "per_guest"}
                  value={r.scaling_mode === "per_guest" ? r.per_guest_divisor : ""}
                  placeholder={r.scaling_mode === "per_guest" ? "25" : "—"}
                  onChange={(e) => set(idx, { per_guest_divisor: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input value={r.notes || ""} placeholder="Optional" onChange={(e) => set(idx, { notes: e.target.value })} />
              </div>
            </div>

            <p className="text-xs text-slate-600">{requirementSummary(r)}</p>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onChange([...rows, { ...blank }])}>
        <Plus className="w-4 h-4" /> Add equipment requirement
      </Button>
    </div>
  );
}