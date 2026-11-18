import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { SITE_RADIUS_METERS } from "@/components/catering/attendanceLocation";

/**
 * Where this employee must physically be to clock in today.
 * Defaults to the restaurant location, unless they are staffed on a catering
 * event today whose assignment says they check in at the event site.
 */
export function useAttendanceTarget({ employeeId, restaurantLocation }) {
  const today = new Date().toISOString().split("T")[0];

  const { data: siteTarget } = useQuery({
    queryKey: ["attendance-target", employeeId, today],
    enabled: !!employeeId,
    queryFn: async () => {
      const assignments = await base44.entities.CateringAssignment.filter({
        employee_id: employeeId,
        event_date: today,
        status: "confirmed",
      });
      const siteAssignment = assignments.find((a) => a.check_in_location_type === "event_site");
      if (!siteAssignment) return null;

      const event = await base44.entities.CateringEvent.get(siteAssignment.event_id);
      if (!event?.venue_lat || !event?.venue_lng) {
        return { missingPin: true, eventName: siteAssignment.event_name };
      }
      return {
        latitude: Number(event.venue_lat),
        longitude: Number(event.venue_lng),
        radius: SITE_RADIUS_METERS,
        label: `${event.venue_name || event.event_name} (event site)`,
        eventName: event.event_name,
      };
    },
  });

  if (siteTarget?.missingPin) {
    return { target: null, missingPin: true, eventName: siteTarget.eventName };
  }
  if (siteTarget) return { target: siteTarget, missingPin: false };

  return {
    target: restaurantLocation
      ? {
          latitude: restaurantLocation.latitude,
          longitude: restaurantLocation.longitude,
          radius: restaurantLocation.radius_meters || 20,
          label: "the branch",
        }
      : null,
    missingPin: false,
  };
}