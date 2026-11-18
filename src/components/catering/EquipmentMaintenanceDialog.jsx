import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BLOCKED_UNIT_STATUSES } from "./equipmentLogic";

export default function EquipmentMaintenanceDialog({ open, onOpenChange, item, units, maintenance }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ record_type: "maintenance", unit_id: "", quantity_affected: "1", description: "", scheduled_date: "", cost: "" });
  const [saving, setSaving] = useState(false);

  if (!item) return null;
  const mine = (maintenance || []).filter((m) => m.equipment_id === item.id);
  const openRecords = mine.filter((m) => m.status !== "resolved");
  const itemUnits = (units || []).filter((u) => u.equipment_id === item.id && u.status !== "retired");

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-equipment-maintenance"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] }),
    ]);

  const logRecord = async () => {
    if (!form.description.trim()) return toast.error("Describe the issue / work needed");
    if (form.record_type === 'damage' && !(Number(form.cost) > 0)) return toast.error('Enter the total damage repair cost in EGP');
    if (item.tracking_mode === "unit" && !form.unit_id) return toast.error("Select the affected unit");
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const unit = itemUnits.find((u) => u.id === form.unit_id);
      await base44.entities.CateringEquipmentMaintenance.create({
        equipment_id: item.id,
        equipment_name: item.name,
        unit_id: unit?.id || "",
        unit_code: unit?.unit_code || "",
        record_type: form.record_type,
        status: "open",
        quantity_affected: item.tracking_mode === "unit" ? 1 : Math.max(1, Number(form.quantity_affected) || 1),
        description: form.description.trim(),
        scheduled_date: form.scheduled_date || "",
        cost: Number(form.cost) || 0,
        reported_by: user?.email || "",
      });
      // Take the specific unit out of service so it can't be reserved
      if (unit && !BLOCKED_UNIT_STATUSES.includes(unit.status)) {
        await base44.entities.CateringEquipmentUnit.update(unit.id, {
          status: form.record_type === "damage" ? "damaged" : "maintenance",
        });
      }
      await refresh();
      setForm({ record_type: "maintenance", unit_id: "", quantity_affected: "1", description: "", scheduled_date: "", cost: "" });
      toast.success("Record logged — the affected equipment is blocked from reservations");
    } catch {
      toast.error("Could not log the record");
    } finally {
      setSaving(false);
    }
  };

  const resolve = async (record) => {
    try {
      const user = await base44.auth.me().catch(() => null);
      await base44.entities.CateringEquipmentMaintenance.update(record.id, {
        status: "resolved",
        resolved_date: new Date().toISOString(),
        resolved_by: user?.email || "",
      });
      // Put the unit back in service if nothing else holds it
      if (record.unit_id) {
        const stillOpen = openRecords.some((m) => m.id !== record.id && m.unit_id === record.unit_id);
        if (!stillOpen) {
          const unit = itemUnits.find((u) => u.id === record.unit_id);
          if (unit && BLOCKED_UNIT_STATUSES.includes(unit.status) && unit.status !== "retired") {
            await base44.entities.CateringEquipmentUnit.update(unit.id, { status: "available" });
          }
        }
      }
      await refresh();
      toast.success("Resolved — back in service");
    } catch {
      toast.error("Could not resolve the record");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Maintenance & damage — {item.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <select value={form.record_type} onChange={(e) => setForm({ ...form, record_type: e.target.value })} className="w-full px-2 py-2 border rounded-lg text-sm">
                  <option value="maintenance">Maintenance</option>
                  <option value="damage">Damage report</option>
                </select>
              </div>
              {item.tracking_mode === "unit" ? (
                <div>
                  <Label>Unit *</Label>
                  <select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="w-full px-2 py-2 border rounded-lg text-sm">
                    <option value="">Select…</option>
                    {itemUnits.map((u) => <option key={u.id} value={u.id}>{u.unit_code}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <Label>Pieces affected</Label>
                  <Input type="number" min="1" value={form.quantity_affected} onChange={(e) => setForm({ ...form, quantity_affected: e.target.value })} />
                </div>
              )}
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Scheduled date</Label>
                <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
              </div>
              <div>
                <Label>{form.record_type === 'damage' ? 'Total repair cost (EGP) *' : 'Cost (EGP)'}</Label>
                <Input type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
            </div>
            <Button className="w-full" onClick={logRecord} disabled={saving}>Log record</Button>
          </div>

          {mine.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">No maintenance history</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {mine.map((m) => (
                <div key={m.id} className="flex items-start justify-between rounded-lg border p-2.5 gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-900">
                      <Badge variant={m.record_type === "damage" ? "destructive" : "secondary"} className="text-xs mr-1">{m.record_type}</Badge>
                      {m.unit_code ? `${m.unit_code} — ` : m.quantity_affected > 1 ? `${m.quantity_affected} pcs — ` : ""}{m.description}
                    </div>
                    <p className="text-xs text-slate-500">
                      {m.scheduled_date ? `Scheduled ${m.scheduled_date} · ` : ""}{m.event_name ? `From event: ${m.event_name} · ` : ""}{m.status}
                    </p>
                  </div>
                  {m.status !== "resolved" && (
                    <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => resolve(m)}>Resolve</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}