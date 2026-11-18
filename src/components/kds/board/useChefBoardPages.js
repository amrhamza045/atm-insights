import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const CHEF_BOARD_EVENT_PAGE_SIZE = 10;
const RELATED_PAGE_SIZE = 50;

export const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function fetchAllCursorPages(entity, query, sort, limit = RELATED_PAGE_SIZE) {
  const byId = new Map();
  let cursor = null;
  while (true) {
    const res = await entity.filter(query, {
      sort,
      limit,
      ...(cursor ? { cursor } : {}),
    });
    for (const row of res?.items || []) {
      if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
    }
    if (!res?.has_more || !res?.next_cursor) break;
    cursor = res.next_cursor;
  }
  return Array.from(byId.values());
}

/**
 * Server-side cursor pagination for the Head Chef Production Board.
 * Loads events in pages of CHEF_BOARD_EVENT_PAGE_SIZE and fetches related
 * ProductionOrder rows per page without unbounded or distinct queries.
 */
export function useChefBoardPages({
  ready,
  canEdit,
  employeeId,
  selectedBranchId,
  from,
  to,
  eventId,
  item,
}) {
  const queryClient = useQueryClient();
  const trimmedItem = item.trim();

  const baseOrderQuery = useMemo(
    () => ({
      order_source: "catering",
      status: { $ne: "cancelled" },
      ...(selectedBranchId && { branch_id: selectedBranchId }),
      ...(!canEdit && { "assigned_staff.employee_id": employeeId }),
      ...((from || to) && {
        needed_by_date: { ...(from && { $gte: from }), ...(to && { $lte: to }) },
      }),
    }),
    [selectedBranchId, canEdit, employeeId, from, to]
  );

  // Staff-only: resolve assigned event IDs via cursor-paginated queries (no distinct)
  const staffScope = useQuery({
    queryKey: ["chef-board-staff-scope", selectedBranchId, from, to, trimmedItem, employeeId],
    enabled: ready && !canEdit && !!employeeId,
    queryFn: async () => {
      const [assignedItems, assignedBatches] = await Promise.all([
        fetchAllCursorPages(
          base44.entities.KitchenItemAssignment,
          {
            employee_id: employeeId,
            ...(trimmedItem && {
              item_name: { $regex: escapeRegex(trimmedItem), $options: "i" },
            }),
          },
          "-created_date"
        ),
        fetchAllCursorPages(
          base44.entities.ProductionOrder,
          {
            ...baseOrderQuery,
            ...(trimmedItem && {
              recipe_name: { $regex: escapeRegex(trimmedItem), $options: "i" },
            }),
          },
          "needed_by_date"
        ),
      ]);
      const assignEventIds = assignedItems.map((a) => a.event_id).filter(Boolean);
      const batchEventIds = assignedBatches.map((b) => b.catering_event_id).filter(Boolean);
      return {
        eventIds: [...new Set([...batchEventIds, ...assignEventIds])],
        matchedAssignEventIds: assignEventIds,
      };
    },
  });

  const staffEventIds = staffScope.data?.eventIds || [];
  const paginationEnabled = ready && (canEdit || staffScope.data !== undefined);

  const pages = useInfiniteQuery({
    queryKey: [
      "chef-board-pages",
      selectedBranchId,
      from,
      to,
      eventId,
      trimmedItem,
      canEdit,
      employeeId,
      canEdit ? null : staffEventIds,
    ],
    enabled: paginationEnabled,
    initialPageParam: null,
    refetchInterval: 20000,
    queryFn: async ({ pageParam }) => {
      let eventQuery;
      if (canEdit) {
        eventQuery = {
          status: { $nin: ["cancelled", "enquiry"] },
          ...(selectedBranchId && { branch_id: selectedBranchId }),
          ...(eventId !== "all" && { id: eventId }),
          ...((from || to) && {
            event_date: { ...(from && { $gte: from }), ...(to && { $lte: to }) },
          }),
        };
      } else {
        const targetIds =
          eventId === "all" ? staffEventIds : staffEventIds.filter((id) => id === eventId);
        if (targetIds.length === 0) {
          return { events: [], batches: [], nextCursor: null, hasMore: false };
        }
        eventQuery = {
          id: { $in: targetIds },
          status: { $ne: "cancelled" },
          ...(selectedBranchId && { branch_id: selectedBranchId }),
          ...((from || to) && {
            event_date: { ...(from && { $gte: from }), ...(to && { $lte: to }) },
          }),
        };
      }

      const eventPage = await base44.entities.CateringEvent.filter(eventQuery, {
        sort: "event_date",
        limit: CHEF_BOARD_EVENT_PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      const pageEvents = eventPage?.items || [];
      const pageEventIds = pageEvents.map((e) => e.id).filter(Boolean);

      let pageBatches = [];
      if (pageEventIds.length > 0) {
        pageBatches = await fetchAllCursorPages(
          base44.entities.ProductionOrder,
          {
            ...baseOrderQuery,
            catering_event_id: { $in: pageEventIds },
            ...(trimmedItem && {
              recipe_name: { $regex: escapeRegex(trimmedItem), $options: "i" },
            }),
          },
          "needed_by_date"
        );
      }

      const hasMore = Boolean(eventPage?.has_more && eventPage?.next_cursor);
      return {
        events: pageEvents,
        batches: pageBatches,
        nextCursor: hasMore ? eventPage.next_cursor : null,
        hasMore,
      };
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.nextCursor : undefined),
  });

  const { events, batches } = useMemo(() => {
    const eventMap = new Map();
    const batchMap = new Map();
    for (const page of pages.data?.pages || []) {
      for (const ev of page.events || []) {
        if (ev?.id && !eventMap.has(ev.id)) eventMap.set(ev.id, ev);
      }
      for (const b of page.batches || []) {
        if (b?.id && !batchMap.has(b.id)) batchMap.set(b.id, b);
      }
    }
    return {
      events: Array.from(eventMap.values()),
      batches: Array.from(batchMap.values()),
    };
  }, [pages.data]);

  // Preserve event dropdown options when narrowing to a single event
  const [cachedOptions, setCachedOptions] = useState([]);
  useEffect(() => {
    setCachedOptions([]);
  }, [selectedBranchId, from, to, canEdit, employeeId]);

  useEffect(() => {
    if (events.length === 0) return;
    setCachedOptions((prev) => {
      const map = new Map(prev.map((e) => [e.id, e]));
      for (const ev of events) {
        if (ev?.id) map.set(ev.id, ev);
      }
      return Array.from(map.values()).sort((a, b) =>
        (a.event_date || "").localeCompare(b.event_date || "")
      );
    });
  }, [events]);

  const matchedAssignSet = useMemo(
    () => new Set(staffScope.data?.matchedAssignEventIds || []),
    [staffScope.data?.matchedAssignEventIds]
  );

  const shownEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          !trimmedItem ||
          canEdit ||
          matchedAssignSet.has(e.id) ||
          batches.some((b) => b.catering_event_id === e.id)
      ),
    [events, trimmedItem, canEdit, matchedAssignSet, batches]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["chef-board-pages"] });
    if (!canEdit) {
      queryClient.invalidateQueries({ queryKey: ["chef-board-staff-scope"] });
    }
  };

  return {
    shownEvents,
    eventOptions: cachedOptions.length > 0 ? cachedOptions : events,
    batches,
    isLoading: (!canEdit && staffScope.isLoading) || pages.isLoading,
    hasMore: Boolean(pages.hasNextPage),
    loadingMore: pages.isFetchingNextPage,
    loadMore: () => pages.fetchNextPage(),
    refresh,
  };
}