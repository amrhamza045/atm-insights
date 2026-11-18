import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { returnReservation } from "./equipmentLogic";
import EquipmentDamageCostField from '@/components/catering/EquipmentDamageCostField';

export default function EquipmentReturnDialog({ open, onOpenChange, reservation }) {
  const queryClient = useQueryClient();
  const [returned, setReturned] = useState("");
  const [damaged, setDamaged] = useState("0");
  const [missing, setMissing] = useState("0");
  const [notes, setNotes] = useState("");
  const [damageCost, setDamageCost] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && reservation) {
      setReturned(String(reservation.quantity || 1));
      setDamaged("0"); setMissing("0"); setNotes(""); setDamageCost('');
    }
  }, [open, reservation]);

  if (!reservation) return null;
  const total = Number(reservation.quantity) || 1;

  const save = async () => {
    const r = Math.max(0, Number(returned) || 0);
    const d = Math.max(0, Number(damaged) || 0);
    const m = Math.max(0, Number(missing) || 0);
    if (r + d + m !== total) return toast.error(`Returned + damaged + missing must equal ${total}`);
    if (d > 0 && !(Number(damageCost) > 0)) return toast.error('Enter the total damage repair cost in EGP');
    setSaving(true);
    try {
      const [user, equipment] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.CateringEquipment.get(reservation.equipment_id).catch(() => null),
      ]);
      await returnReservation({
        reservation, equipment,
        returnedQty: r, damagedQty: d, missingQty: m,
        notes, damageCost: d > 0 ? Number(damageCost) : 0, userEmail: user?.email || "",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-equipment-reservations"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-equipment-maintenance"] }),
      ]);
      toast.success(d > 0 ? "Checked in — a damage record was opened against the event" : "Checked in");
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Could not check the equipment back in');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Return — {reservation.equipment_name}{reservation.unit_code ? ` (${reservation.unit_code})` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">Sent out: {total} {reservation.unit_label || (reservation.unit_code ? "unit" : "pcs")} · Event: {reservation.event_name}</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Returned OK</Label>
              <Input type="number" min="0" value={returned} onChange={(e) => setReturned(e.target.value)} />
            </div>
            <div>
              <Label>Damaged</Label>
              <Input type="number" min="0" value={damaged} onChange={(e) => setDamaged(e.target.value)} />
            </div>
            <div>
              <Label>Missing</Label>
              <Input type="number" min="0" value={missing} onChange={(e) => setMissing(e.target.value)} />
            </div>
          </div>
          <EquipmentDamageCostField damaged={damaged} value={damageCost} onChange={setDamageCost} />
          <div>
            <Label>Condition notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scratches, missing parts, who signed off…" />
          </div>
          <p className="text-xs text-slate-500">
            Damage opens a repair record and takes the equipment out of service; missing pieces are logged against this event for follow-up.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Check in</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}