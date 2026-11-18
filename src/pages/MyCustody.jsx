import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Truck } from "lucide-react";
import CustodyStatusView from "@/components/catering/custody/CustodyStatusView";

export default function MyCustody() {
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const { data: employee } = useQuery({
    queryKey: ["employee", currentUser?.email],
    queryFn: async () => {
      const list = await base44.entities.Employee.filter({ email: currentUser.email });
      return list[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["my-custody-trips", currentUser?.email, employee?.id],
    queryFn: () => base44.entities.CateringTrip.list("-created_date", 200),
    enabled: !!currentUser?.email,
  });

  const email = (currentUser?.email || "").toLowerCase();
  const myTrips = trips.filter((t) => {
    if (t.stage === "cancelled") return false;
    const assigned = (t.custody_assignments || []).some(
      (a) => (a.assigned_email || "").toLowerCase() === email
    );
    return assigned || (employee?.id && t.driver_employee_id === employee.id);
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-slate-400" /> My chain of custody
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Trips where you are responsible for a handoff. Confirm your stage and count the items — any shortfall is flagged automatically.
        </p>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-slate-400">Loading…</Card>
      ) : myTrips.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          You have no custody stages assigned to you right now.
        </Card>
      ) : (
        myTrips.map((trip) => (
          <Card key={trip.id} className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-slate-400" /> {trip.event_name || "Event"} · {trip.trip_label || "Trip"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {trip.event_date || "No date"} · {trip.vehicle_name || "No vehicle"} · Driver: {trip.driver_name || "not assigned"}
              </p>
            </div>
            <CustodyStatusView trip={trip} canAssign={false} />
          </Card>
        ))
      )}
    </div>
  );
}