import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { buildConflictMap } from "./conflictRules";

// Detection runs on the UNFILTERED events inside the visible window. Display stays
// filtered, but a clash with an event hidden by the venue/type filter must still show —
// otherwise filtering silently hides the counterparty and the conflict disappears.
export default function useCateringConflicts({ events = [], windowStart, windowEnd }) {
  const assignmentsQ = useQuery({
    queryKey: ["calendarConflictAssignments"],
    queryFn: () => base44.entities.CateringAssignment.list("-event_date", 1000),
  });
  const reservationsQ = useQuery({
    queryKey: ["calendarConflictReservations"],
    queryFn: () => base44.entities.CateringEquipmentReservation.list("-event_date", 1000),
  });
  const equipmentQ = useQuery({
    queryKey: ["calendarConflictEquipment"],
    queryFn: () => base44.entities.CateringEquipment.list(),
  });
  const maintenanceQ = useQuery({
    queryKey: ["calendarConflictMaintenance"],
    queryFn: () => base44.entities.CateringEquipmentMaintenance.list("-created_date", 500),
  });

  const from = windowStart ? format(windowStart, "yyyy-MM-dd") : null;
  const to = windowEnd ? format(windowEnd, "yyyy-MM-dd") : null;

  const conflictsByEventId = useMemo(() => {
    if (!from || !to) return {};
    const inWindow = (d) => {
      const key = String(d || "").slice(0, 10);
      return key >= from && key <= to;
    };

    const windowEvents = events.filter((e) => inWindow(e?.event_date));
    if (windowEvents.length === 0) return {};

    return buildConflictMap({
      events: windowEvents,
      assignments: (assignmentsQ.data || []).filter((a) => inWindow(a.event_date)),
      reservations: (reservationsQ.data || []).filter((r) => inWindow(r.event_date)),
      equipment: equipmentQ.data || [],
      maintenance: maintenanceQ.data || [],
    });
  }, [events, from, to, assignmentsQ.data, reservationsQ.data, equipmentQ.data, maintenanceQ.data]);

  return {
    conflictsByEventId,
    isLoading: assignmentsQ.isLoading || reservationsQ.isLoading || equipmentQ.isLoading || maintenanceQ.isLoading,
  };
}