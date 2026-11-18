import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Pencil, RefreshCw, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { TRIP_STAGES, STAGE_LABELS, mapsLink, dispatchTrip, buildChecklist, transportCost } from "./logisticsLogic";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import TripReturnDialog from "./TripReturnDialog";
import CustodyMiniBadge from "./custody/CustodyMiniBadge";

const STAGE_STYLES = {
  planned: "bg-slate-100 text-slate-700",
  loading: "bg-amber-100 text-amber-700",
  dispatched: "bg-blue-100 text-blue-700",
  arrived: "bg-indigo-100 text-indigo-700",
  returning: "bg-purple-100 text-purple-700",
  returned: "bg-emerald-100 text-emerald-700",
};

export default function TripCard({ trip, event, eventTrips, onEdit, canWrite = true }) {
  const queryClient = useQueryClient();
  const [working, setWorking] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const checklist = trip.checklist || [];
  const unloaded = checklist.filter((i) => !i.loaded).length;
  const canEditChecklist = canWrite && ["planned", "loading"].includes(trip.stage);
  const link = mapsLink(trip);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-trips"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-trips-all"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-equipment-reservations"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] }),
    ]);

  const update = async (data, msg) => {
    setWorking(true);
    try {
      await base44.entities.CateringTrip.update(trip.id, data);
      await refresh();
      if (msg) toast.success(msg);
    } catch {
      toast.error("Could not update the trip");
    } finally {
      setWorking(false);
    }
  };

  const toggleLoaded = (key) =>
    update({ checklist: checklist.map((i) => (i.item_key === key ? { ...i, loaded: !i.loaded } : i)) });

  const regenerate = async () => {
    setWorking(true);
    try {
      const fresh = await buildChecklist(event, eventTrips, trip.id);
      const merged = fresh.map((i) => {
        const old = checklist.find((x) => x.item_key === i.item_key);
        return old ? { ...i, loaded: old.loaded } : i;
      });
      await base44.entities.CateringTrip.update(trip.id, { checklist: merged });
      await refresh();
      toast.success("Checklist refreshed from the event's plan");
    } catch {
      toast.error("Could not refresh the checklist");
    } finally {
      setWorking(false);
    }
  };

  const handleDispatch = async () => {
    if (!trip.vehicle_id) return toast.error("Assign a vehicle before dispatching");
    if (unloaded > 0 && !window.confirm(`${unloaded} item(s) are not checked as loaded. Dispatch anyway?`)) return;
    setWorking(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      await dispatchTrip(trip, user?.email);
      await refresh();
      toast.success("Dispatched — equipment marked as out with the trip");
    } catch {
      toast.error("Could not dispatch the trip");
    } finally {
      setWorking(false);
    }
  };

  const cancelTrip = async () => {
    if (!window.confirm("Cancel this trip? The checklist items stay reserved on the event.")) return;
    await update({ stage: "cancelled", cancel_reason: "Cancelled by staff" }, "Trip cancelled");
  };

  const stageAction = {
    planned: { label: "Start loading", run: () => update({ stage: "loading", loading_started_at: new Date().toISOString() }, "Loading started") },
    loading: { label: "Dispatch", run: handleDispatch },
    dispatched: { label: "Mark arrived", run: () => update({ stage: "arrived", arrived_at: new Date().toISOString() }, "Marked as arrived") },
    arrived: { label: "Start return", run: () => update({ stage: "returning", returning_at: new Date().toISOString() }, "Heading back") },
    returning: { label: "Return check-in", run: () => setShowReturn(true) },
  }[trip.stage];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-slate-400" /> {trip.trip_label || "Trip"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {trip.vehicle_name ? `${trip.vehicle_name}${trip.vehicle_plate ? ` (${trip.vehicle_plate})` : ""}` : "No vehicle"} · {trip.driver_name || "No driver"} · {formatCurrency(transportCost(trip), true)}
          </p>
          {trip.vehicle_conflict_override && (
            <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3" /> Vehicle double-booked with override: {trip.vehicle_conflict_detail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className={`text-xs ${STAGE_STYLES[trip.stage] || ""}`}>{STAGE_LABELS[trip.stage]}</Badge>
          {canWrite && <Button size="sm" variant="ghost" className="h-7" onClick={onEdit}><Pencil className="w-3 h-3" /></Button>}
          {canWrite && trip.stage !== "returned" && (
            <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={cancelTrip}><XCircle className="w-3 h-3" /></Button>
          )}
        </div>
      </div>

      {/* Stage progress */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {TRIP_STAGES.map((s, i) => {
          const reached = TRIP_STAGES.indexOf(trip.stage) >= i;
          return (
            <React.Fragment key={s}>
              {i > 0 && <div className={`h-0.5 w-4 shrink-0 ${reached ? "bg-emerald-500" : "bg-slate-200"}`} />}
              <span className={`text-xs whitespace-nowrap px-1.5 py-0.5 rounded ${trip.stage === s ? "bg-emerald-600 text-white font-medium" : reached ? "text-emerald-700" : "text-slate-400"}`}>
                {STAGE_LABELS[s]}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        <span>{trip.destination_label}{trip.destination_address ? ` — ${trip.destination_address}` : ""}</span>
        {link && <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open map</a>}
      </div>

      {/* Loading checklist */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
          <p className="text-xs font-semibold text-slate-700">
            Loading checklist · {checklist.length - unloaded}/{checklist.length} loaded
          </p>
          {canEditChecklist && (
            <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={regenerate} disabled={working}>
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          )}
        </div>
        {checklist.length === 0 ? (
          <p className="text-xs text-slate-400 p-3">Nothing to load yet — plan food (Planning tab) and reserve equipment (Equipment tab), then refresh.</p>
        ) : (
          <div className="divide-y max-h-56 overflow-y-auto">
            {checklist.map((i) => (
              <label key={i.item_key} className={`flex items-center gap-2 px-3 py-1.5 text-sm ${canEditChecklist ? "cursor-pointer hover:bg-slate-50" : ""}`}>
                <input type="checkbox" checked={!!i.loaded} disabled={!canEditChecklist || working} onChange={() => toggleLoaded(i.item_key)} />
                <span className={`min-w-0 truncate ${i.loaded ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {i.quantity} {i.unit} {i.label}
                </span>
                <span className="ml-auto flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-xs">{i.source}</Badge>
                  {i.return_expected && i.returned_status !== "pending" && (
                    <Badge className={`text-xs ${i.returned_status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {i.returned_status}
                    </Badge>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {trip.stage !== "cancelled" && <CustodyMiniBadge trip={trip} />}

      {trip.stage === "returned" && trip.discrepancy_count > 0 && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> {trip.discrepancy_count} item(s) came back damaged or missing — logged against this event's equipment records.
        </p>
      )}

      {canWrite && stageAction && (
        <Button size="sm" className="gap-1.5" onClick={stageAction.run} disabled={working}>
          {stageAction.label}
        </Button>
      )}

      <TripReturnDialog open={showReturn} onOpenChange={setShowReturn} trip={trip} />
    </Card>
  );
}