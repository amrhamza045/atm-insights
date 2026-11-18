import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wrench, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const LIVE = ["requested", "reserved", "dispatched", "returned"];

/**
 * This event's equipment cost. Each line starts from the predefined per-event cost of the item
 * and can be overridden for this event only.
 */
export default function EventEquipmentCostCard({ event, equipment = [] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");

  const { data: reservations = [] } = useQuery({
    queryKey: ["catering-equipment-reservations", event?.id],
    queryFn: () => base44.entities.CateringEquipmentReservation.filter({ event_id: event.id }, "-created_date"),
    enabled: !!event?.id,
  });

  if (!event) return null;

  const rows = reservations
    .filter((r) => LIVE.includes(r.status))
    .map((r) => {
      const item = equipment.find((e) => e.id === r.equipment_id);
      const predefined = Number(item?.usage_cost_per_event) || 0;
      const rate = r.cost_overridden ? Number(r.usage_cost_per_event) || 0 : predefined;
      const qty = Number(r.quantity) || 1;
      return {
        id: r.id,
        name: r.equipment_name,
        qty,
        unit: r.unit_label || "pcs",
        rate,
        predefined,
        overridden: !!r.cost_overridden,
        subtotal: rate * qty,
      };
    });

  const total = rows.reduce((s, r) => s + r.subtotal, 0);
  const missing = rows.filter((r) => r.rate === 0).map((r) => r.name);

  const saveRate = async (row) => {
    await base44.entities.CateringEquipmentReservation.update(row.id, {
      usage_cost_per_event: Number(value) || 0,
      cost_overridden: true,
    });
    await queryClient.invalidateQueries({ queryKey: ["catering-equipment-reservations"] });
    setEditing(null);
    toast.success("Cost updated for this event only");
  };

  const resetRate = async (row) => {
    await base44.entities.CateringEquipmentReservation.update(row.id, { cost_overridden: false });
    await queryClient.invalidateQueries({ queryKey: ["catering-equipment-reservations"] });
    toast.success("Back to the predefined cost");
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-slate-400" /> Equipment cost for this event
        </h3>
        <p className="font-semibold text-amber-700">{formatCurrency(total)}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No equipment reserved for this event yet — reserve an item below.</p>
      ) : (
        <div className="divide-y">
          {rows.map((r) => (
            <div key={r.id} className="py-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-700">
                {r.qty} {r.unit} × {r.name}
                <span className="text-slate-400"> · {formatCurrency(r.rate)} each{r.overridden ? " (event override)" : ""}</span>
              </span>
              {editing === r.id ? (
                <span className="flex items-center gap-1">
                  <Input type="number" min="0" className="h-7 w-28" value={value} onChange={(e) => setValue(e.target.value)} />
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => saveRate(r)}><Check className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(null)}><X className="w-3 h-3" /></Button>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{formatCurrency(r.subtotal)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => { setEditing(r.id); setValue(String(r.rate)); }}
                  >
                    <Pencil className="w-3 h-3" /> Cost
                  </Button>
                  {r.overridden && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => resetRate(r)}>
                      Reset to {formatCurrency(r.predefined)}
                    </Button>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <p className="text-xs text-amber-700">
          No cost defined yet for: {missing.join(", ")} — set the predefined cost in Operations › Assets and Resources › Equipment, or edit the line above for this event only.
        </p>
      )}
    </Card>
  );
}