import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// The cost budget management set for one catering event (null when none).
export default function useEventCostBudget(eventId) {
  const { data = null, isLoading } = useQuery({
    queryKey: ["cost-budget", eventId],
    queryFn: async () => (await base44.entities.CateringCostBudget.filter({ event_id: eventId }, "-updated_date", 1))[0] || null,
    enabled: !!eventId,
  });
  return { budget: data, isLoading };
}