import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";
import { companyToday } from "@/components/utils/timezoneHelper";

/**
 * Upcoming / past for records that keep an event_id but no event date
 * (quotes, payments, invitations): the ids of the branch's upcoming events
 * (today included) become an event_id filter. `ready` stays false until they
 * arrive, so the list never loads unfiltered first.
 */
export default function useEventWhenScope(when) {
  const { selectedBranchId } = useBranch();
  const today = companyToday();
  const scoped = when === "upcoming" || when === "past";
  const { data: ids } = useQuery({
    queryKey: ["catering-events", "upcoming-ids", selectedBranchId, today],
    queryFn: async () => {
      const page = await base44.entities.CateringEvent.filter(
        { branch_id: selectedBranchId, event_date: { $gte: today } },
        { distinct: "id", limit: 1000 }
      );
      return page.items;
    },
    enabled: scoped && !!selectedBranchId,
  });
  if (!scoped) return { query: {}, ready: true };
  if (!ids) return { query: {}, ready: false };
  return { query: { event_id: when === "upcoming" ? { $in: ids } : { $nin: ids } }, ready: true };
}