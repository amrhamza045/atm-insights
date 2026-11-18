import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  available: "bg-emerald-100 text-emerald-700",
  in_use: "bg-blue-100 text-blue-700",
  maintenance: "bg-amber-100 text-amber-700",
  damaged: "bg-red-100 text-red-700",
  retired: "bg-slate-100 text-slate-500",
};
// in_use is managed by dispatch/return — not settable by hand here
const MANUAL_STATUSES = ["available", "maintenance", "damaged", "retired"];

export default function EquipmentUnitsDialog({ open, onOpenChange, item, units }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [serial, setSerial] = useState("");
  const [saving, setSaving] = useState(false);

  if (!item) return null;
  const mine = (units || []).filter((u) => u.equipment_id === item.id);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] });

  const addUnit = async () => {
    if (!code.trim()) return toast.error("Unit code is required");
    setSaving(true);
    try {
      await base44.entities.CateringEquipmentUnit.create({
        equipment_id: item.id,
        equipment_name: item.name,
        unit_code: code.trim(),
        serial_number: serial.trim(),
        status: "available",
        current_location_type: "branch",
        current_location_name: item.home_branch_name || item.storage_location || "",
      });
      await refresh();
      setCode(""); setSerial("");
      toast.success("Unit added");
    } catch {
      toast.error("Could not add the unit");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (unit, status) => {
    try {
      await base44.entities.CateringEquipmentUnit.update(unit.id, { status });
      await refresh();
    } catch {
      toast.error("Could not update the unit");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Units — {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Unit code (e.g. GEN-01)" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input placeholder="Serial (optional)" value={serial} onChange={(e) => setSerial(e.target.value)} />
            <Button className="gap-1 shrink-0" onClick={addUnit} disabled={saving}><Plus className="w-4 h-4" /> Add</Button>
          </div>

          {mine.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No units yet</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {mine.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border p-2.5 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{u.unit_code}{u.serial_number ? ` · ${u.serial_number}` : ""}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {u.current_location_type === "event" ? `Out at ${u.current_event_name || "event"}` : (u.current_location_name || "In store")}
                      {u.purchase_date ? ` · bought ${u.purchase_date}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs ${STATUS_STYLES[u.status] || ""}`}>{u.status.replace(/_/g, " ")}</Badge>
                    {u.status !== "in_use" && (
                      <select
                        value={u.status}
                        onChange={(e) => setStatus(u, e.target.value)}
                        className="px-2 py-1 border rounded text-xs"
                      >
                        {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">Units flagged maintenance, damaged or retired can never be reserved for an event.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}