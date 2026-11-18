import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Truck, AlertTriangle } from "lucide-react";
import CustodyStatusView from "./CustodyStatusView";
import EventCustodyStages from "./EventCustodyStages";
import { CUSTODY_LABELS } from "./custodyMeta";
import CustodyEmailToggle from "./CustodyEmailToggle";
import { useCateringEditAccess } from "@/components/catering/useCateringEditAccess";

// Chain of custody lives on the Equipment tab — custody is equipment
// accountability, not vehicle logistics.
export default function CustodyPanel({ event }) {
  const queryClient = useQueryClient();
  const { canEditRecord } = useCateringEditAccess();
  const { data: trips = [] } = useQuery({
    queryKey: ["catering-trips", event?.id],
    queryFn: () => base44.entities.CateringTrip.filter({ event_id: event.id }, "-created_date"),
    enabled: !!event?.id,
  });
  const { data: checkpoints = [] } = useQuery({
    queryKey: ["custody-checkpoints-event", event?.id],
    queryFn: () => base44.entities.CateringCustodyCheckpoint.filter({ event_id: event.id }),
    enabled: !!event?.id,
  });

  const activeTrips = trips.filter((t) => t.stage !== "cancelled");
  const shortages = checkpoints.filter((c) => c.status === "shortage");

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> Chain of custody
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Four handoffs per trip — dispatched, delivered, collected, returned. The trip's driver confirms dispatch, delivery and collection; the warehouse team confirms the return. Count the items; any shortfall is flagged automatically.
            </p>
          </div>
          <CustodyEmailToggle />
        </div>
      </Card>

      {!event ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          Scope an event on the Events tab to track its equipment custody chain.
        </Card>
      ) : activeTrips.length === 0 ? (
        canEditRecord(event) ? (
          <EventCustodyStages
            event={event}
            onTripCreated={() => queryClient.invalidateQueries({ queryKey: ["catering-trips", event.id] })}
          />
        ) : (
          <Card className="p-8 text-center text-sm text-slate-400">
            No custody chain has been set up for this event yet.
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {activeTrips.map((trip) => (
            <Card key={trip.id} className="p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-400" /> {trip.trip_label || "Trip"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {trip.vehicle_name || "No vehicle"} · Driver: {trip.driver_name || "not assigned"}
                </p>
              </div>
              <CustodyStatusView trip={trip} />
            </Card>
          ))}
        </div>
      )}

      {shortages.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Shortages on this event
          </p>
          <div className="mt-2 divide-y">
            {shortages.map((c) => (
              <div key={c.id} className="py-2 text-xs">
                <p className="font-medium text-slate-800">
                  {c.trip_label || "Trip"} · {CUSTODY_LABELS[c.stage] || c.stage}
                </p>
                <p className="text-slate-600 mt-0.5">
                  Handed over by {c.responsible_name || "—"} → checked by {c.reported_by_name} on{" "}
                  {new Date(c.confirmed_at).toLocaleString()}
                </p>
                <p className="text-slate-500 mt-0.5">
                  {(c.item_details || [])
                    .filter((i) => Number(i.actual_quantity) < Number(i.expected_quantity))
                    .map((i) => `${i.item_name}: ${i.actual_quantity}/${i.expected_quantity} ${i.unit || ""}`)
                    .join(" · ")}
                </p>
                {c.discrepancy_notes && <p className="text-slate-500 mt-0.5 italic">{c.discrepancy_notes}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}