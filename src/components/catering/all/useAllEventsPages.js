import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";

const PAGE_SIZE = 50;

/**
 * One entity's records across every event of the selected branch, 50 at a time,
 * plus the server's total. Keys start with the tab's own key (e.g.
 * "catering-payments"), so the refreshes that already follow a change in an
 * event also refresh these lists.
 */
export default function useAllEventsPages({ entity, cacheKey, sort, query = {}, enabled = true }) {
  const { selectedBranchId } = useBranch();
  const where = { branch_id: selectedBranchId, ...query };
  const on = enabled && !!selectedBranchId;

  const pages = useInfiniteQuery({
    queryKey: [cacheKey, "all-events", where, sort],
    queryFn: ({ pageParam }) =>
      base44.entities[entity].filter(where, { sort, limit: PAGE_SIZE, ...(pageParam && { cursor: pageParam }) }),
    initialPageParam: null,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
    placeholderData: keepPreviousData,
    enabled: on,
  });
  const { data: total } = useQuery({
    queryKey: [cacheKey, "all-events-count", where],
    queryFn: () => base44.entities[entity].count(where),
    enabled: on,
  });

  return {
    rows: pages.data?.pages.flatMap((page) => page.items) || [],
    total,
    // Waiting on its filter (not enabled yet) counts as loading, not as an empty list.
    isLoading: pages.isLoading || (!enabled && !!selectedBranchId),
    hasMore: !!pages.hasNextPage,
    loadingMore: pages.isFetchingNextPage,
    loadMore: () => pages.fetchNextPage(),
  };
}