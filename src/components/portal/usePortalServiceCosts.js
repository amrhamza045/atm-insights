import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/** Staffing & logistics breakdown for one of the customer's own events. */
export default function usePortalServiceCosts(eventId) {
  return useQuery({
    queryKey: ["portal-service-costs", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPortalEventServiceCosts", { event_id: eventId });
      return res.data;
    },
    enabled: !!eventId,
  });
}