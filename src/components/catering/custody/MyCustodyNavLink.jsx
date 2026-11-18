import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { CUSTODY_STAGES, STAGE_CONFIRMER } from "@/components/catering/custody/custodyMeta";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export default function MyCustodyNavLink({ currentUser, employee }) {
  const email = (currentUser?.email || "").toLowerCase();
  const { isRouteOpen } = useModuleAccess();

  const { data: trips = [] } = useQuery({
    queryKey: ["my-custody-trips", email, employee?.id],
    queryFn: () => base44.entities.CateringTrip.filter({ stage: { $nin: ["cancelled", "returned"] } }, "-created_date", 200),
    enabled: !!email,
  });

  // Stages this user is responsible for on each open trip.
  const myStagesByTrip = trips
    .map((t) => {
      const stages = new Set(
        (t.custody_assignments || [])
          .filter((a) => (a.assigned_email || "").toLowerCase() === email)
          .map((a) => a.stage)
      );
      if (employee?.id && t.driver_employee_id === employee.id) {
        CUSTODY_STAGES.filter((s) => STAGE_CONFIRMER[s] === "driver").forEach((s) => stages.add(s));
      }
      return { id: t.id, stages: [...stages] };
    })
    .filter((x) => x.stages.length > 0);

  const tripIds = myStagesByTrip.map((x) => x.id);

  const { data: checkpoints = [] } = useQuery({
    queryKey: ["my-custody-checkpoints", tripIds.join(",")],
    queryFn: () => base44.entities.CateringCustodyCheckpoint.filter({ trip_id: { $in: tripIds } }),
    enabled: tripIds.length > 0,
  });

  const hasPending = myStagesByTrip.some(({ id, stages }) =>
    stages.some((s) => !checkpoints.some((c) => c.trip_id === id && c.stage === s))
  );

  if (!hasPending || !isRouteOpen("MyCustody")) return null;

  return (
    <Button asChild variant="ghost" size="sm" className="gap-1 px-2 sm:px-3">
      <Link to="/MyCustody">
        <Check className="w-4 h-4" />
        <span className="hidden md:inline text-xs sm:text-sm">My Custody</span>
      </Link>
    </Button>
  );
}