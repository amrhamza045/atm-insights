import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

/** Edit one staffing role's default pay basis and rate, straight from the cost breakdown. */
export default function RoleRateDialog({ open, onOpenChange, role }) {
  const queryClient = useQueryClient();
  const [basis, setBasis] = useState("hourly");
  const [hourly, setHourly] = useState(0);
  const [flat, setFlat] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!role) return;
    setBasis(role.pay_basis === "flat_event" ? "flat_event" : "hourly");
    setHourly(role.default_hourly_rate ?? 0);
    setFlat(role.default_flat_rate ?? 0);
  }, [role]);

  if (!role) return null;

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.CateringStaffingRole.update(role.id, {
        pay_basis: basis,
        default_hourly_rate: Number(hourly) || 0,
        default_flat_rate: Number(flat) || 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["catering-staffing-roles"] });
      toast.success(`${role.name} rate updated`);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{role.name} — default rate</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Pay basis</Label>
            <Select value={basis} onValueChange={setBasis}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="flat_event">Flat per event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {basis === "flat_event" ? (
            <div>
              <Label>Flat fee per person (EGP)</Label>
              <Input type="number" min="0" value={flat} onChange={(e) => setFlat(e.target.value)} />
            </div>
          ) : (
            <div>
              <Label>Rate per hour (EGP)</Label>
              <Input type="number" min="0" value={hourly} onChange={(e) => setHourly(e.target.value)} />
            </div>
          )}
          <p className="text-xs text-slate-500">
            Used to cost slots that aren't filled yet. Assigned employees keep their own rate.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>Save rate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}