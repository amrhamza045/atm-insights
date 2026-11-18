import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { completeTripReturn } from "./logisticsLogic";
import EquipmentDamageCostField from '@/components/catering/EquipmentDamageCostField';

export default function TripReturnDialog({ open, onOpenChange, trip }) {
  const queryClient = useQueryClient();
  const [results, setResults] = useState({});
  const [damageCosts, setDamageCosts] = useState({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const returnable = (trip?.checklist || []).filter((i) => i.return_expected);

  useEffect(() => {
    if (open && trip) {
      const init = {};
      returnable.forEach((i) => { init[i.item_key] = "ok"; });
      setResults(init);
      setDamageCosts({});
      setNotes("");
    }
  }, [open, trip]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!trip) return null;

  const save = async () => {
    if (returnable.some(i => i.source === 'equipment' && results[i.item_key] === 'damaged' && !(Number(damageCosts[i.item_key]) > 0))) return toast.error('Enter the total repair cost for each damaged equipment line');
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const res = await completeTripReturn({ trip, results, damageCosts, notes, userEmail: user?.email || "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-trips"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-trips-all"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-equipment-reservations"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-equipment-maintenance"] }),
      ]);
      toast.success(
        res.discrepancies > 0
          ? `Checked in — ${res.discrepancies} discrepancy(ies) flagged against the event's equipment records`
          : "Checked in — everything came back"
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Could not complete the return check-in');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Return check-in — {trip.trip_label || trip.event_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          {returnable.length === 0 ? (
            <p className="text-slate-500">Nothing on this trip was expected back (food only) — confirm to close the trip.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {returnable.map((i) => (
                <div key={i.item_key} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                  <span className="min-w-0 truncate">{i.quantity} {i.unit} {i.label}</span>
                  <select
                    value={results[i.item_key] || "ok"}
                    onChange={(e) => setResults({ ...results, [i.item_key]: e.target.value })}
                    className={`px-2 py-1 border rounded text-xs shrink-0 ${results[i.item_key] === "ok" ? "" : "border-red-300 text-red-700"}`}
                  >
                    <option value="ok">Returned OK</option>
                    <option value="damaged">Damaged</option>
                    <option value="missing">Missing</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          {returnable.filter(i => i.source === 'equipment' && results[i.item_key] === 'damaged').map(i => <div key={i.item_key}><p className="text-sm font-medium">{i.label}</p><EquipmentDamageCostField damaged={i.quantity} value={damageCosts[i.item_key] || ''} onChange={value => setDamageCosts({ ...damageCosts, [i.item_key]: value })} /></div>)}
          <div>
            <Label>Condition notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Who signed off, damage details…" />
          </div>
          <p className="text-xs text-slate-500">
            Damaged items open a repair record; missing items are logged as a shortfall — both against this event in the equipment history.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Back</Button>
          <Button onClick={save} disabled={saving}>Complete return</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}