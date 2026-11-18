import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Truck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { dispatchReservation } from "./equipmentLogic";
import EquipmentReturnDialog from "./EquipmentReturnDialog";

const STATUS_STYLES = {
  requested: "bg-red-100 text-red-700",
  reserved: "bg-emerald-100 text-emerald-700",
  dispatched: "bg-blue-100 text-blue-700",
  returned: "bg-slate-100 text-slate-600",
  released: "bg-slate-100 text-slate-400",
};

export default function EquipmentReservationsPanel({ event }) {
  const queryClient = useQueryClient();
  const [returning, setReturning] = useState(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["catering-equipment-reservations", event?.id],
    queryFn: () => base44.entities.CateringEquipmentReservation.filter({ event_id: event.id }, "-created_date"),
    enabled: !!event?.id,
  });

  if (!event) return null;

  const active = rows.filter((r) => ["requested", "reserved", "dispatched"].includes(r.status));
  const gaps = active.filter((r) => r.status === "requested");
  const overrides = active.filter((r) => r.had_conflict);
  const done = rows.length - active.length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catering-equipment-reservations"] });

  const dispatch = async (r) => {
    try {
      const user = await base44.auth.me().catch(() => null);
      await dispatchReservation(r, user?.email);
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] })]);
      toast.success("Marked as dispatched");
    } catch {
      toast.error("Could not dispatch");
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Equipment</p>
        <div className="flex gap-1.5">
          <Badge variant="outline" className="text-xs">{active.length} active</Badge>
          {done > 0 && <Badge variant="outline" className="text-xs">{done} closed</Badge>}
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {gaps.length} equipment request(s) not covered
          </p>
          {gaps.map((r) => (
            <p key={r.id} className="text-xs text-red-700 mt-0.5">• {r.quantity} {r.unit_label || ""} {r.equipment_name} — {r.conflict_detail || "not reserved"}</p>
          ))}
          <p className="text-xs text-red-700 mt-1">Free up or add stock in the Equipment tab, then reserve again.</p>
        </div>
      )}

      {overrides.length > 0 && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> {overrides.length} reservation(s) double-booked with a manager override
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No equipment reserved for this event yet — reserve from the Equipment tab.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-900 truncate">
                  {r.equipment_name}{r.unit_code ? ` · ${r.unit_code}` : ` · ${r.quantity} ${r.unit_label || "pcs"}`}
                </p>
                {r.had_conflict && <p className="text-xs text-warning-700 truncate">Override: {r.conflict_detail}</p>}
                {r.status === "returned" && (r.damaged_quantity > 0 || r.missing_quantity > 0) && (
                  <p className="text-xs text-red-600">
                    {r.damaged_quantity > 0 ? `${r.damaged_quantity} damaged` : ""}
                    {r.damaged_quantity > 0 && r.missing_quantity > 0 ? " · " : ""}
                    {r.missing_quantity > 0 ? `${r.missing_quantity} missing` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={`text-xs ${STATUS_STYLES[r.status] || ""}`}>{r.status}</Badge>
                {r.status === "reserved" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => dispatch(r)}>
                    <Truck className="w-3 h-3" /> Dispatch
                  </Button>
                )}
                {r.status === "dispatched" && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setReturning(r)}>
                    <Undo2 className="w-3 h-3" /> Return
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <EquipmentReturnDialog open={!!returning} onOpenChange={(o) => !o && setReturning(null)} reservation={returning} />
    </Card>
  );
}