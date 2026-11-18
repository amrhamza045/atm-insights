import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Boxes, CalendarCheck, Pencil, ArrowRightLeft } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { equipmentAvailability } from "./equipmentLogic";
import EquipmentFormDialog from "./EquipmentFormDialog";
import CopyBranchAssetsDialog from "./CopyBranchAssetsDialog";
import EquipmentUnitsDialog from "./EquipmentUnitsDialog";
import EquipmentMaintenanceDialog from "./EquipmentMaintenanceDialog";
import ReserveEquipmentDialog from "./ReserveEquipmentDialog";
import EventEquipmentCostCard from "./EventEquipmentCostCard";
import CustodyPanel from "./custody/CustodyPanel";
import CollapsibleSection from "./CollapsibleSection";
import DeleteEquipmentDialog from "./DeleteEquipmentDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

export default function EquipmentTab({ event }) {
  const { selectedBranchId } = useBranch();
  const [formItem, setFormItem] = useState(undefined); // undefined = closed, null = new
  const [unitsItem, setUnitsItem] = useState(null);
  const [maintItem, setMaintItem] = useState(null);
  const [reserveItem, setReserveItem] = useState(null);
  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  const canBulkDelete = isAdmin || permissions?.catering_settings_edit === true;
  const [selected, setSelected] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const { data: equipment = [] } = useQuery({
    queryKey: ["catering-equipment"],
    queryFn: () => base44.entities.CateringEquipment.list("-created_date", 500),
  });
  const { data: units = [] } = useQuery({
    queryKey: ["catering-equipment-units"],
    queryFn: () => base44.entities.CateringEquipmentUnit.list("-created_date", 3000),
  });
  const { data: reservations = [] } = useQuery({
    queryKey: ["catering-equipment-reservations"],
    queryFn: () => base44.entities.CateringEquipmentReservation.list("-created_date", 1000),
  });
  const { data: maintenance = [] } = useQuery({
    queryKey: ["catering-equipment-maintenance"],
    queryFn: () => base44.entities.CateringEquipmentMaintenance.list("-created_date", 500),
  });

  const visible = equipment.filter(
    (e) => e.is_active !== false && (!e.home_branch_id || e.home_branch_id === selectedBranchId)
  );
  const availabilityDate = event?.event_date || null;

  return (
    <div className="space-y-4">
      {event && (
        <CollapsibleSection title="Equipment cost for this event">
          <EventEquipmentCostCard event={event} equipment={equipment} />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Equipment registry"
        subtitle={
          availabilityDate
            ? `Availability shown for ${availabilityDate} (scoped event: ${event.event_name})`
            : "Availability counts every live reservation — scope an event to check a specific date"
        }
        action={
          <div className="flex gap-2">
            {canBulkDelete && selected.length > 0 && (
              <Button variant="destructive" className="gap-1.5" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="w-4 h-4" /> Delete {selected.length}
              </Button>
            )}
            <Button variant="outline" className="gap-1.5" onClick={() => setCopyOpen(true)}>
              <ArrowRightLeft className="w-4 h-4" /> Copy from branch
            </Button>
            <Button className="gap-1.5" onClick={() => setFormItem(null)}>
              <Plus className="w-4 h-4" /> Add equipment
            </Button>
          </div>
        }
      >
      {visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">No equipment yet — add ovens, tents, chairs, generators…</Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {canBulkDelete && (
                  <th className="px-3 py-2 w-8">
                    <Checkbox
                      checked={selected.length > 0 && selected.length === visible.length}
                      onCheckedChange={(c) => setSelected(c ? visible.map((v) => v.id) : [])}
                    />
                  </th>
                )}
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Equipment</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Tracking</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Availability</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Cost / event</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Location</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {visible.map((item) => {
                const av = equipmentAvailability(item, units, reservations, maintenance, availabilityDate);
                return (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    {canBulkDelete && (
                      <td className="px-3 py-2">
                        <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggle(item.id)} />
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category || "—"}{!item.home_branch_id ? " · shared pool" : ""}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.tracking_mode === "unit" ? "Per unit" : `Bulk (${item.unit_label || "pcs"})`}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={av.free > 0 ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                        {av.free} free
                      </span>
                      <span className="text-slate-500"> / {av.total}</span>
                      {av.reserved > 0 && <span className="text-amber-700"> · {av.reserved} booked</span>}
                      {av.underMaintenance > 0 && <span className="text-red-600"> · {av.underMaintenance} out of service</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {Number(item.usage_cost_per_event) > 0 ? (
                        <span className="text-slate-700 font-medium">
                          {formatCurrency(item.usage_cost_per_event)}
                          <span className="text-slate-400 font-normal"> / {item.unit_label || "pcs"}{item.cost_source === "rented" ? " · rented" : ""}</span>
                        </span>
                      ) : (
                        <span className="text-amber-700">Not costed</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {item.home_branch_name || "All branches"}{item.storage_location ? ` · ${item.storage_location}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setReserveItem(item)}>
                          <CalendarCheck className="w-3 h-3" /> Reserve
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => setUnitsItem(item)}>
                          <Boxes className="w-3 h-3" /> Units
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => setMaintItem(item)}>
                          <Wrench className="w-3 h-3" /> Maintenance
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setFormItem(item)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </CollapsibleSection>

      <CollapsibleSection title="Chain of custody">
        <CustodyPanel event={event} />
      </CollapsibleSection>

      <DeleteEquipmentDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        items={visible.filter((v) => selected.includes(v.id))}
        reservations={reservations}
        onDone={() => { setSelected([]); setConfirmOpen(false); }}
      />
      <CopyBranchAssetsDialog open={copyOpen} onOpenChange={setCopyOpen} assetTypes={["equipment"]} title="Copy Equipment from Another Branch" />
      <EquipmentFormDialog open={formItem !== undefined} onOpenChange={(o) => !o && setFormItem(undefined)} item={formItem} />
      <EquipmentUnitsDialog open={!!unitsItem} onOpenChange={(o) => !o && setUnitsItem(null)} item={unitsItem} units={units} />
      <EquipmentMaintenanceDialog open={!!maintItem} onOpenChange={(o) => !o && setMaintItem(null)} item={maintItem} units={units} maintenance={maintenance} />
      <ReserveEquipmentDialog open={!!reserveItem} onOpenChange={(o) => !o && setReserveItem(null)} item={reserveItem} units={units} reservations={reservations} maintenance={maintenance} scopedEvent={event} />
    </div>
  );
}