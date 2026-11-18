import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { EVENTS_PAGE_SIZE, buildEventsWhere, resolveEventsSort } from "./eventsTabQuery";

export default function usePaginatedEvents({ dateRange, eventType, locationType, sortBy, search }) {
  const { selectedBranchId } = useBranch();
  const debouncedSearch = useDebouncedValue(search.trim());

  const baseWindowWhere = useMemo(
    () => buildEventsWhere({ branchId: selectedBranchId, dateRange }),
    [selectedBranchId, dateRange]
  );
  const where = useMemo(
    () => buildEventsWhere({ branchId: selectedBranchId, dateRange, eventType, locationType, search: debouncedSearch }),
    [selectedBranchId, dateRange, eventType, locationType, debouncedSearch]
  );
  const serverSort = resolveEventsSort(sortBy, dateRange);
  const filterKey = useMemo(() => JSON.stringify([selectedBranchId, where, serverSort]), [selectedBranchId, where, serverSort]);

  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const currentPage = pageState.key === filterKey ? pageState.page : 0;
  const setPage = (nextPage) => setPageState({ key: filterKey, page: nextPage });

  const pagesQuery = useInfiniteQuery({
    queryKey: ["catering-events", "paged", where, serverSort, EVENTS_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      base44.entities.CateringEvent.filter(where, {
        sort: serverSort,
        limit: EVENTS_PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null,
    getNextPageParam: (last) => (last?.has_more && last?.next_cursor ? last.next_cursor : undefined),
    enabled: !!selectedBranchId,
  });

  const { data: totalCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ["catering-events", "count", where],
    queryFn: () => base44.entities.CateringEvent.count(where),
    enabled: !!selectedBranchId,
  });

  const { data: windowTotal = 0 } = useQuery({
    queryKey: ["catering-events", "count-window", baseWindowWhere],
    queryFn: () => base44.entities.CateringEvent.count(baseWindowWhere),
    enabled: !!selectedBranchId,
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ["catering-events", "event-types", selectedBranchId],
    queryFn: async () => {
      const res = await base44.entities.CateringEvent.aggregate({
        query: { branch_id: selectedBranchId },
        groupBy: "event_type",
      });
      return (res?.rows || []).map((r) => r.event_type).filter(Boolean).sort();
    },
    enabled: !!selectedBranchId,
  });

  const loadedPages = pagesQuery.data?.pages || [];
  const safePage = loadedPages.length > 0 ? Math.min(currentPage, loadedPages.length - 1) : 0;
  const events = loadedPages[safePage]?.items || [];
  const totalPages = Math.max(1, Math.ceil((totalCount || events.length) / EVENTS_PAGE_SIZE));
  const hasNextPage = safePage + 1 < loadedPages.length || Boolean(pagesQuery.hasNextPage);
  const hasPrevPage = safePage > 0;

  const goToNextPage = async () => {
    if (!hasNextPage || pagesQuery.isFetchingNextPage) return;
    const target = safePage + 1;
    if (target < loadedPages.length) {
      setPage(target);
      return;
    }
    const res = await pagesQuery.fetchNextPage();
    if (target < (res.data?.pages?.length || 0)) setPage(target);
  };

  const goToPrevPage = () => {
    if (safePage > 0) setPage(safePage - 1);
  };

  const goToPage = async (targetPage) => {
    const target = Math.max(0, Math.min(targetPage, totalPages - 1));
    if (target === safePage || pagesQuery.isFetchingNextPage) return;
    if (target < loadedPages.length) {
      setPage(target);
      return;
    }
    let pages = loadedPages;
    while (target >= pages.length) {
      const res = await pagesQuery.fetchNextPage();
      const nextPages = res.data?.pages || [];
      if (nextPages.length <= pages.length) break;
      pages = nextPages;
    }
    if (pages.length > 0) {
      setPage(Math.min(target, pages.length - 1));
    }
  };

  return {
    events,
    totalCount,
    windowTotal,
    eventTypes,
    page: safePage,
    totalPages,
    pageSize: EVENTS_PAGE_SIZE,
    hasNextPage,
    hasPrevPage,
    isLoading: pagesQuery.isLoading || countLoading,
    isFetchingPage: pagesQuery.isFetchingNextPage,
    goToNextPage,
    goToPrevPage,
    goToPage,
  };
}