import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Car } from "lucide-react";
import EventScopeNotice from "./EventScopeNotice";
import { transportCost, ACTIVE_TRIP_STAGES } from "./logisticsLogic";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import TripCard from "./TripCard";
import TripSetupDialog from "./TripSetupDialog";
import VehiclesDialog from "./VehiclesDialog";
import { useCateringEditAccess } from "@/components/catering/useCateringEditAccess";


export default function LogisticsTab({ event }) {
  const [setupTrip, setSetupTrip] = useState(undefined); // undefined = closed, null = new
  const [showVehicles, setShowVehicles] = useState(false);
  const { canEditRecord } = useCateringEditAccess();

  const { data: trips = [] } = useQuery({
    queryKey: ["catering-trips", event?.id],
    queryFn: () => base44.entities.CateringTrip.filter({ event_id: event.id }, "-created_date"),
    enabled: !!event?.id,
  });
  const { data: allTrips = [] } = useQuery({
    queryKey: ["catering-trips-all"],
    queryFn: () => base44.entities.CateringTrip.list("-created_date", 500),
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["catering-vehicles"],
    queryFn: () => base44.entities.CateringVehicle.list("-created_date", 200),
  });

  if (!event) return <EventScopeNotice />;
  const canWrite = canEditRecord(event);

  const activeTrips = trips.filter((t) => t.stage !== "cancelled");
  const totalTransport = activeTrips.reduce((s, t) => s + transportCost(t), 0);
  const discrepancies = activeTrips.reduce((s, t) => s + (Number(t.discrepancy_count) || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{event.event_name} · {event.event_date}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Badge variant="outline" className="text-xs">{activeTrips.length} trip(s)</Badge>
            <Badge variant="outline" className="text-xs">Transport estimate: {formatCurrency(totalTransport, true)}</Badge>
            {discrepancies > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{discrepancies} return discrepanc{discrepancies === 1 ? "y" : "ies"}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setShowVehicles(true)}>
            <Car className="w-4 h-4" /> Vehicles
          </Button>
          <Button className="gap-1.5" onClick={() => setSetupTrip(null)} disabled={event.status === "cancelled" || !canWrite}>
            <Plus className="w-4 h-4" /> New trip
          </Button>
        </div>
      </Card>

      <p className="text-xs text-slate-500">
        Live GPS tracking, traffic-aware routing and telematics need an external provider — flagged as a future integration; trips carry a map link to the stored venue instead.
      </p>

      {activeTrips.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          No trips yet — create one to generate the loading checklist from this event's food, stock and equipment.
        </Card>
      ) : (
        <div className="space-y-3">
          {activeTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} event={event} eventTrips={trips} onEdit={() => setSetupTrip(trip)} canWrite={canWrite} />
          ))}
        </div>
      )}

      {trips.some((t) => t.stage === "cancelled") && (
        <p className="text-xs text-slate-400">{trips.filter((t) => t.stage === "cancelled").length} cancelled trip(s) kept on record.</p>
      )}

      <TripSetupDialog
        open={setupTrip !== undefined}
        onOpenChange={(o) => !o && setSetupTrip(undefined)}
        trip={setupTrip}
        event={event}
        eventTrips={trips.filter((t) => ACTIVE_TRIP_STAGES.includes(t.stage))}
        allTrips={allTrips}
        vehicles={vehicles}
      />
      <VehiclesDialog open={showVehicles} onOpenChange={setShowVehicles} vehicles={vehicles} />
    </div>
  );
}