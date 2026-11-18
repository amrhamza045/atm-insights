import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";

/**
 * The branch's events inside one date window ({ query, sort } from whenQuery
 * or eventDateWindow), read from the server — choosing past or all dates is
 * what loads older events.
 */
export default function useEventsInWindow(range, limit = 200) {
  const { selectedBranchId } = useBranch();
  const where = { branch_id: selectedBranchId, ...range.query };
  return useQuery({
    queryKey: ["catering-events", "window", where, range.sort, limit],
    queryFn: () => base44.entities.CateringEvent.filter(where, range.sort, limit),
    enabled: !!selectedBranchId,
  });
}