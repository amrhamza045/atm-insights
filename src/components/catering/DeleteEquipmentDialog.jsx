import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Deletes only the explicitly selected equipment with its units and maintenance logs.
// Reserved items need an extra confirmation; their reservations are removed too.
export default function DeleteEquipmentDialog({ open, onOpenChange, items, reservations, onDone }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirmReserved, setConfirmReserved] = useState(false);
  const reservedIds = new Set(reservations.map((r) => r.equipment_id));
  const reserved = items.filter((i) => reservedIds.has(i.id));
  const blocked = reserved.length > 0 && !confirmReserved;

  const handleDelete = async () => {
    setBusy(true);
    try {
      for (const item of items) {
        if (reservedIds.has(item.id)) {
          await base44.entities.CateringEquipmentReservation.deleteMany({ equipment_id: item.id });
        }
        await base44.entities.CateringEquipmentUnit.deleteMany({ equipment_id: item.id });
        await base44.entities.CateringEquipmentMaintenance.deleteMany({ equipment_id: item.id });
        await base44.entities.CateringEquipment.delete(item.id);
      }
      ["catering-equipment", "catering-equipment-units", "catering-equipment-maintenance", "catering-equipment-reservations"].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      );
      toast.success(`Deleted ${items.length} equipment item(s)`);
      setConfirmReserved(false);
      onDone();
    } catch (e) {
      toast.error(e.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setConfirmReserved(false); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete selected equipment?</DialogTitle>
          <DialogDescription>This permanently removes the items below with their units and maintenance logs.</DialogDescription>
        </DialogHeader>
        <ul className="text-sm list-disc pl-5 max-h-40 overflow-y-auto">{items.map((i) => <li key={i.id}>{i.name}</li>)}</ul>
        {reserved.length > 0 && (
          <label className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded p-2">
            <Checkbox checked={confirmReserved} onCheckedChange={(v) => setConfirmReserved(!!v)} />
            <span>
              {reserved.map((i) => i.name).join(", ")} {reserved.length === 1 ? "has" : "have"} event reservations. I understand
              those reservations will be deleted too.
            </span>
          </label>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={busy || items.length === 0 || blocked} onClick={handleDelete}>
            {busy ? "Deleting…" : `Delete ${items.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}