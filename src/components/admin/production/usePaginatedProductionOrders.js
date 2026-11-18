import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { fuzzyMatchText } from "./fuzzyProductionSearch";
import {
  PRODUCTION_EVENTS_PAGE_SIZE,
  PRODUCTION_REGULAR_PAGE_SIZE,
  isRegularOnlyMode,
  shouldIncludeUnlinkedRegular,
  resolveProductionEventsSort,
  resolveRegularOrdersSort,
  buildRegularOrdersServerQuery,
  buildEventOrdersServerQuery,
  buildProductionEventsServerQuery,
} from "./productionOrdersQuery";

function matchesOrderFilters(order, filters) {
  const { batchStatus = "all", productionType = "all", recipeId = "all", branchFilter = "all" } = filters;
  if (branchFilter !== "all" && order.branch_id !== branchFilter) return false;
  if (batchStatus !== "all") {
    if (batchStatus === "active" && order.status !== "pending" && order.status !== "in_progress") return false;
    if (batchStatus !== "active" && order.status !== batchStatus) return false;
  }
  if (recipeId !== "all" && order.recipe_id !== recipeId) return false;
  if (productionType === "catering" && !order.catering_event_id && order.order_source !== "catering") return false;
  if (productionType === "regular" && (order.catering_event_id || order.order_source === "catering")) return false;
  if (productionType === "sub_recipe" && order.production_stage !== "sub_recipe" && !order.parent_production_order_id) {
    return false;
  }
  return true;
}

async function fetchScopedAll(entity, query, chunkLimit = 50) {
  const items = [];
  let cursor = undefined;
  while (true) {
    const res = await entity.filter(query, {
      sort: "-created_date",
      limit: chunkLimit,
      ...(cursor ? { cursor } : {}),
    });
    const batch = res?.items || [];
    items.push(...batch);
    if (!res?.has_more || !res?.next_cursor) break;
    cursor = res.next_cursor;
  }
  return items;
}

export default function usePaginatedProductionOrders({
  selectedBranchId,
  scopedEventId,
  filters,
  bounds,
}) {
  const debouncedSearch = useDebouncedValue((filters.search || "").trim(), 250);
  const effectiveFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const effectiveBranch = selectedBranchId || (effectiveFilters.branchFilter !== "all" ? effectiveFilters.branchFilter : null);
  const regularOnly = isRegularOnlyMode(effectiveFilters, scopedEventId);
  const includeUnlinked = shouldIncludeUnlinkedRegular(effectiveFilters, scopedEventId);
  const eventsSort = resolveProductionEventsSort(effectiveFilters.quickFilter, effectiveFilters.sortBy);
  const regularSort = resolveRegularOrdersSort(effectiveFilters.sortBy);

  const needsOrderLevelConstraint =
    effectiveFilters.recipeId !== "all" ||
    effectiveFilters.batchStatus !== "all" ||
    effectiveFilters.productionType === "sub_recipe";
  const hasSearch = Boolean(debouncedSearch);

  // Filter key for main events pagination (or regular-only pagination)
  const mainFilterKey = useMemo(
    () =>
      JSON.stringify([
        "main",
        effectiveBranch,
        scopedEventId,
        effectiveFilters.quickFilter,
        effectiveFilters.batchStatus,
        effectiveFilters.productionType,
        effectiveFilters.recipeId,
        effectiveFilters.eventStatus,
        effectiveFilters.sortBy,
        effectiveFilters.dateFrom,
        effectiveFilters.dateTo,
        debouncedSearch,
      ]),
    [effectiveBranch, scopedEventId, effectiveFilters, debouncedSearch]
  );

  const [mainPageState, setMainPageState] = useState({ key: mainFilterKey, page: 0 });
  const currentMainPage = mainPageState.key === mainFilterKey ? mainPageState.page : 0;
  const setMainPage = (nextPage) => setMainPageState({ key: mainFilterKey, page: nextPage });

  const regularFilterKey = useMemo(
    () =>
      JSON.stringify([
        "regular",
        effectiveBranch,
        effectiveFilters.batchStatus,
        effectiveFilters.productionType,
        effectiveFilters.recipeId,
        effectiveFilters.sortBy,
        debouncedSearch,
      ]),
    [
      effectiveBranch,
      effectiveFilters.batchStatus,
      effectiveFilters.productionType,
      effectiveFilters.recipeId,
      effectiveFilters.sortBy,
      debouncedSearch,
    ]
  );

  const [regularPageState, setRegularPageState] = useState({ key: regularFilterKey, page: 0 });
  const currentRegularPage = regularPageState.key === regularFilterKey ? regularPageState.page : 0;
  const setRegularPage = (nextPage) => setRegularPageState({ key: regularFilterKey, page: nextPage });

  // 1) Resolve constrained event IDs via server aggregate when batch-level filters or search are active
  const { data: constrainedState, isLoading: loadingConstraints } = useQuery({
    queryKey: [
      "productionOrders",
      "constraints",
      effectiveBranch,
      scopedEventId,
      effectiveFilters.recipeId,
      effectiveFilters.batchStatus,
      effectiveFilters.productionType,
      effectiveFilters.eventStatus,
      effectiveFilters.quickFilter,
      effectiveFilters.dateFrom,
      effectiveFilters.dateTo,
      debouncedSearch,
      bounds.today,
    ],
    enabled: !regularOnly && (needsOrderLevelConstraint || hasSearch),
    queryFn: async () => {
      const baseOrderQuery = buildEventOrdersServerQuery({
        effectiveBranch,
        scopedEventId,
        filters: effectiveFilters,
        bounds,
        includeSearch: false,
      });

      if (!baseOrderQuery) {
        return { eventIds: [], batchCountByEvent: {} };
      }

      if (!hasSearch) {
        const agg = await base44.entities.ProductionOrder.aggregate({
          query: baseOrderQuery,
          groupBy: "catering_event_id",
        });
        const rows = (agg?.rows || []).filter((r) => r.catering_event_id);
        const batchCountByEvent = {};
        for (const r of rows) {
          batchCountByEvent[r.catering_event_id] = Number(r.count) || 0;
        }
        return {
          eventIds: rows.map((r) => r.catering_event_id),
          batchCountByEvent,
        };
      }

      const searchOrderQuery = buildEventOrdersServerQuery({
        effectiveBranch,
        scopedEventId,
        filters: effectiveFilters,
        bounds,
        includeSearch: true,
      });
      const eventSearchQuery = buildProductionEventsServerQuery({
        effectiveBranch,
        scopedEventId,
        filters: effectiveFilters,
        bounds,
        constrainedEventIds: null,
      });

      const [orderSearchAgg, eventSearchAgg, constraintOrderAgg] = await Promise.all([
        searchOrderQuery
          ? base44.entities.ProductionOrder.aggregate({
              query: searchOrderQuery,
              groupBy: "catering_event_id",
            })
          : Promise.resolve({ rows: [] }),
        eventSearchQuery
          ? base44.entities.CateringEvent.aggregate({
              query: eventSearchQuery,
              groupBy: "id",
            })
          : Promise.resolve({ rows: [] }),
        needsOrderLevelConstraint
          ? base44.entities.ProductionOrder.aggregate({
              query: baseOrderQuery,
              groupBy: "catering_event_id",
            })
          : Promise.resolve(null),
      ]);

      const orderMatchedIds = new Set(
        (orderSearchAgg?.rows || []).map((r) => r.catering_event_id).filter(Boolean)
      );
      const eventMatchedIds = new Set(
        (eventSearchAgg?.rows || []).map((r) => r.id).filter(Boolean)
      );

      const batchCountByEvent = {};
      for (const r of (constraintOrderAgg || orderSearchAgg)?.rows || []) {
        if (r.catering_event_id) {
          batchCountByEvent[r.catering_event_id] = Number(r.count) || 0;
        }
      }

      if (needsOrderLevelConstraint) {
        const allowedByBatch = new Set(
          (constraintOrderAgg?.rows || []).map((r) => r.catering_event_id).filter(Boolean)
        );
        const combined = new Set();
        for (const id of orderMatchedIds) {
          if (allowedByBatch.has(id)) combined.add(id);
        }
        for (const id of eventMatchedIds) {
          if (allowedByBatch.has(id)) combined.add(id);
        }
        return {
          eventIds: Array.from(combined),
          batchCountByEvent,
        };
      }

      return {
        eventIds: Array.from(new Set([...orderMatchedIds, ...eventMatchedIds])),
        batchCountByEvent,
      };
    },
  });

  const constrainedEventIds =
    !regularOnly && (needsOrderLevelConstraint || hasSearch) ? constrainedState?.eventIds : null;

  const eventsServerQuery = useMemo(
    () =>
      regularOnly
        ? null
        : buildProductionEventsServerQuery({
            effectiveBranch,
            scopedEventId,
            filters: effectiveFilters,
            bounds,
            constrainedEventIds,
          }),
    [regularOnly, effectiveBranch, scopedEventId, effectiveFilters, bounds, constrainedEventIds]
  );

  const eventsQueryEnabled =
    !regularOnly &&
    eventsServerQuery !== null &&
    (!(needsOrderLevelConstraint || hasSearch) || constrainedState !== undefined);

  // 2) Server-side total event count & total event batch count
  const { data: eventTotals, isLoading: loadingEventTotals } = useQuery({
    queryKey: [
      "productionOrders",
      "eventTotals",
      eventsServerQuery,
      needsOrderLevelConstraint,
      constrainedState?.batchCountByEvent,
    ],
    enabled: eventsQueryEnabled,
    queryFn: async () => {
      if (!eventsServerQuery) return { eventCount: 0, batchCount: 0 };
      const agg = await base44.entities.CateringEvent.aggregate({
        query: eventsServerQuery,
        groupBy: "id",
        sum: ["production_batch_count"],
      });
      const rows = agg?.rows || [];
      const batchCounts = constrainedState?.batchCountByEvent || null;
      return {
        eventCount: rows.length,
        batchCount: rows.reduce((s, r) => {
          if (needsOrderLevelConstraint && batchCounts && r.id in batchCounts) {
            return s + (Number(batchCounts[r.id]) || 0);
          }
          return s + (Number(r.sum_production_batch_count) || 0);
        }, 0),
      };
    },
  });

  // 3) Server-side cursor-paged CateringEvents + scoped orders & reservations for that page
  const eventsPagesQuery = useInfiniteQuery({
    queryKey: [
      "productionOrders",
      "eventsPaged",
      eventsServerQuery,
      eventsSort,
      PRODUCTION_EVENTS_PAGE_SIZE,
      effectiveFilters.batchStatus,
      effectiveFilters.recipeId,
      effectiveFilters.productionType,
    ],
    enabled: eventsQueryEnabled,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const pageResult = await base44.entities.CateringEvent.filter(eventsServerQuery, {
        sort: eventsSort,
        limit: PRODUCTION_EVENTS_PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      });
      const events = pageResult?.items || [];
      const eventIds = events.map((e) => e.id);

      if (eventIds.length === 0) {
        return {
          events: [],
          ordersByEventId: {},
          reservationsByEventId: {},
          nextCursor: null,
          hasMore: false,
        };
      }

      const pageOrderQuery = {
        catering_event_id: { $in: eventIds },
      };
      if (effectiveFilters.recipeId !== "all") {
        pageOrderQuery.recipe_id = effectiveFilters.recipeId;
      }
      if (effectiveFilters.batchStatus !== "all") {
        pageOrderQuery.status =
          effectiveFilters.batchStatus === "active"
            ? { $in: ["pending", "in_progress"] }
            : effectiveFilters.batchStatus;
      }
      if (effectiveFilters.productionType === "sub_recipe") {
        pageOrderQuery.production_stage = "sub_recipe";
      }

      const [pageOrders, pageReservations] = await Promise.all([
        fetchScopedAll(
          base44.entities.ProductionOrder,
          pageOrderQuery,
          PRODUCTION_EVENTS_PAGE_SIZE * 5
        ),
        fetchScopedAll(
          base44.entities.CateringReservation,
          { event_id: { $in: eventIds }, purpose: "production_input" },
          PRODUCTION_EVENTS_PAGE_SIZE * 10
        ),
      ]);

      const ordersByEventId = {};
      for (const o of pageOrders) {
        if (!o.catering_event_id) continue;
        if (!ordersByEventId[o.catering_event_id]) ordersByEventId[o.catering_event_id] = [];
        ordersByEventId[o.catering_event_id].push(o);
      }

      const reservationsByEventId = {};
      for (const r of pageReservations) {
        if (!r.event_id) continue;
        if (!reservationsByEventId[r.event_id]) reservationsByEventId[r.event_id] = [];
        reservationsByEventId[r.event_id].push(r);
      }

      return {
        events,
        ordersByEventId,
        reservationsByEventId,
        nextCursor: pageResult?.next_cursor || null,
        hasMore: Boolean(pageResult?.has_more && pageResult?.next_cursor),
      };
    },
    getNextPageParam: (lastPage) => (lastPage?.hasMore ? lastPage.nextCursor : undefined),
  });

  // 4) Server-side cursor-paged Regular / Non-Event ProductionOrders
  const regularServerQuery = useMemo(
    () =>
      includeUnlinked
        ? buildRegularOrdersServerQuery({
            effectiveBranch,
            filters: effectiveFilters,
          })
        : null,
    [includeUnlinked, effectiveBranch, effectiveFilters]
  );

  const { data: totalRegularBatches = 0, isLoading: loadingRegularCount } = useQuery({
    queryKey: ["productionOrders", "regularCount", regularServerQuery],
    enabled: Boolean(regularServerQuery),
    queryFn: () => base44.entities.ProductionOrder.count(regularServerQuery),
  });

  const regularPagesQuery = useInfiniteQuery({
    queryKey: [
      "productionOrders",
      "regularPaged",
      regularServerQuery,
      regularSort,
      PRODUCTION_REGULAR_PAGE_SIZE,
    ],
    enabled: Boolean(regularServerQuery),
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      base44.entities.ProductionOrder.filter(regularServerQuery, {
        sort: regularSort,
        limit: PRODUCTION_REGULAR_PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (last) => (last?.has_more && last?.next_cursor ? last.next_cursor : undefined),
  });

  // Compute active page of event groups
  const loadedEventPages = eventsPagesQuery.data?.pages || [];
  const safeEventPage =
    loadedEventPages.length > 0 ? Math.min(currentMainPage, loadedEventPages.length - 1) : 0;
  const activeEventPageData = loadedEventPages[safeEventPage];

  const { pageEventGroups, pageReservationsByEventId, pageEventBatchCount } = useMemo(() => {
    const groups = [];
    const resMap = new Map();
    let batchSum = 0;

    if (!activeEventPageData) {
      return { pageEventGroups: groups, pageReservationsByEventId: resMap, pageEventBatchCount: 0 };
    }

    for (const [evId, resList] of Object.entries(activeEventPageData.reservationsByEventId || {})) {
      resMap.set(evId, resList);
    }

    for (const ev of activeEventPageData.events || []) {
      const rawOrders = activeEventPageData.ordersByEventId?.[ev.id] || [];
      let visibleOrders = rawOrders.filter((o) => matchesOrderFilters(o, effectiveFilters));

      if (debouncedSearch) {
        const eventMatched = fuzzyMatchText(
          debouncedSearch,
          ev.event_name,
          ev.event_code,
          ev.client_name,
          ev.client_phone,
          ev.event_date
        );
        if (!eventMatched) {
          const matchingSub = visibleOrders.filter((o) =>
            fuzzyMatchText(debouncedSearch, o.recipe_name, o.output_item_name, o.needed_by_date)
          );
          if (matchingSub.length > 0) visibleOrders = matchingSub;
        }
      }

      if (visibleOrders.length === 0) continue;

      const nonCancelled = visibleOrders.filter((o) => o.status !== "cancelled");
      const allBatchesCompleted =
        nonCancelled.length > 0 && nonCancelled.every((o) => o.status === "completed");
      const isDatePassed = Boolean(ev.event_date && bounds?.today && ev.event_date < bounds.today);
      const isCompleted =
        ev.status === "completed" ||
        allBatchesCompleted ||
        (isDatePassed && ev.status !== "cancelled");

      batchSum += visibleOrders.length;
      groups.push({
        key: ev.id,
        isUnlinked: false,
        isCompleted,
        isDatePassed,
        isPastCompleted: isDatePassed && isCompleted,
        eventId: ev.id,
        eventName: ev.event_name || "Catering Event",
        eventCode: ev.event_code || "",
        eventDate: ev.event_date || "",
        eventStatus: ev.status || "",
        customerName: ev.client_name || "",
        customerPhone: ev.client_phone || "",
        guests: ev.expected_guests || 0,
        branchName: ev.branch_name || "",
        orders: visibleOrders,
      });
    }

    return {
      pageEventGroups: groups,
      pageReservationsByEventId: resMap,
      pageEventBatchCount: batchSum,
    };
  }, [activeEventPageData, effectiveFilters, debouncedSearch, bounds]);

  // Compute active page of regular (unlinked) batches
  const loadedRegularPages = regularPagesQuery.data?.pages || [];
  const activeRegularPageIdx = regularOnly ? currentMainPage : currentRegularPage;
  const safeRegularPage =
    loadedRegularPages.length > 0
      ? Math.min(activeRegularPageIdx, loadedRegularPages.length - 1)
      : 0;
  const unlinkedOrders = includeUnlinked
    ? loadedRegularPages[safeRegularPage]?.items || []
    : [];

  // Navigation helpers for events
  const totalEventsCount = regularOnly ? 0 : eventTotals?.eventCount ?? pageEventGroups.length;
  const totalEventBatchesCount = regularOnly ? 0 : eventTotals?.batchCount ?? pageEventBatchCount;
  const totalEventPages = Math.max(
    1,
    Math.ceil((totalEventsCount || pageEventGroups.length) / PRODUCTION_EVENTS_PAGE_SIZE)
  );
  const hasNextEventPage =
    safeEventPage + 1 < loadedEventPages.length || Boolean(eventsPagesQuery.hasNextPage);
  const hasPrevEventPage = safeEventPage > 0;

  const goToEventPage = async (targetPage) => {
    const target = Math.max(0, Math.min(targetPage, totalEventPages - 1));
    if (target === safeEventPage || eventsPagesQuery.isFetchingNextPage) return;
    if (target < loadedEventPages.length) {
      setMainPage(target);
      return;
    }
    let pages = loadedEventPages;
    while (target >= pages.length) {
      const res = await eventsPagesQuery.fetchNextPage();
      const nextPages = res.data?.pages || [];
      if (nextPages.length <= pages.length) break;
      pages = nextPages;
    }
    if (pages.length > 0) {
      setMainPage(Math.min(target, pages.length - 1));
    }
  };

  // Navigation helpers for regular batches
  const totalRegularPages = Math.max(
    1,
    Math.ceil((totalRegularBatches || unlinkedOrders.length) / PRODUCTION_REGULAR_PAGE_SIZE)
  );
  const hasNextRegularPage =
    safeRegularPage + 1 < loadedRegularPages.length || Boolean(regularPagesQuery.hasNextPage);
  const hasPrevRegularPage = safeRegularPage > 0;

  const setActiveRegularPage = regularOnly ? setMainPage : setRegularPage;

  const goToRegularPage = async (targetPage) => {
    const target = Math.max(0, Math.min(targetPage, totalRegularPages - 1));
    if (target === safeRegularPage || regularPagesQuery.isFetchingNextPage) return;
    if (target < loadedRegularPages.length) {
      setActiveRegularPage(target);
      return;
    }
    let pages = loadedRegularPages;
    while (target >= pages.length) {
      const res = await regularPagesQuery.fetchNextPage();
      const nextPages = res.data?.pages || [];
      if (nextPages.length <= pages.length) break;
      pages = nextPages;
    }
    if (pages.length > 0) {
      setActiveRegularPage(Math.min(target, pages.length - 1));
    }
  };

  const isLoading = regularOnly
    ? regularPagesQuery.isLoading || loadingRegularCount
    : loadingConstraints ||
      (eventsQueryEnabled && (eventsPagesQuery.isLoading || loadingEventTotals)) ||
      (includeUnlinked && regularPagesQuery.isLoading);

  return {
    regularOnly,
    includeUnlinked,
    // Event groups for the current page
    eventGroups: pageEventGroups,
    reservationsByEventId: pageReservationsByEventId,
    pageEventBatchCount,
    totalEventsCount,
    totalEventBatchesCount,
    eventPage: safeEventPage,
    totalEventPages,
    eventPageSize: PRODUCTION_EVENTS_PAGE_SIZE,
    hasNextEventPage,
    hasPrevEventPage,
    isFetchingEventPage: eventsPagesQuery.isFetchingNextPage,
    goToNextEventPage: () => goToEventPage(safeEventPage + 1),
    goToPrevEventPage: () => {
      if (safeEventPage > 0) setMainPage(safeEventPage - 1);
    },
    goToEventPage,
    // Regular (non-event) batches for the current page
    unlinkedOrders,
    totalRegularBatches: includeUnlinked ? totalRegularBatches : 0,
    regularPage: safeRegularPage,
    totalRegularPages,
    regularPageSize: PRODUCTION_REGULAR_PAGE_SIZE,
    hasNextRegularPage,
    hasPrevRegularPage,
    isFetchingRegularPage: regularPagesQuery.isFetchingNextPage,
    goToNextRegularPage: () => goToRegularPage(safeRegularPage + 1),
    goToPrevRegularPage: () => {
      if (safeRegularPage > 0) setActiveRegularPage(safeRegularPage - 1);
    },
    goToRegularPage,
    // Overall loading & totals
    isLoading,
    totalVisibleBatches: pageEventBatchCount + unlinkedOrders.length,
    totalMatchingBatches: totalEventBatchesCount + (includeUnlinked ? totalRegularBatches : 0),
  };
}