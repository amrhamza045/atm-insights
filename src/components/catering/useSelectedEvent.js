import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// A copy of the event that a Catering list already loaded (plain or paged lists).
function loadedCopy(queryClient, id) {
  for (const [, data] of queryClient.getQueriesData({ queryKey: ["catering-events"] })) {
    const rows = Array.isArray(data) ? data : data?.pages?.flatMap((page) => page.items || []) || [];
    const hit = rows.find((row) => row?.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * The event named in the address, read on its own so no tab has to load the
 * whole branch to find it. A copy a list already holds shows straight away.
 */
export default function useSelectedEvent(eventId) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["catering-events", "one", eventId],
    queryFn: () => base44.entities.CateringEvent.get(eventId),
    enabled: !!eventId,
    placeholderData: () => loadedCopy(queryClient, eventId),
  });
  return (eventId && data) || null;
}