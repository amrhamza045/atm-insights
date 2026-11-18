import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fuzzyMatchText } from "./fuzzyProductionSearch";

export const PAST_EVENTS_PAGE_SIZE = 10;

const MONTH_INDEX = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toCaseInsensitiveRegex(term) {
  return escapeRegex(term).replace(/[a-zA-Z]/g, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);
}

function parseDateSearchHint(search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return null;
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(q)) return q;
  const slashMatch = q.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const tokens = q.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const mNum = MONTH_INDEX[tokens[i]];
    if (mNum) {
      const next = tokens[i + 1]?.replace(/\D/g, "");
      const prev = tokens[i - 1]?.replace(/\D/g, "");
      const day = next || prev;
      if (day && Number(day) >= 1 && Number(day) <= 31) {
        return `-${mNum}-${String(Number(day)).padStart(2, "0")}`;
      }
      return `-${mNum}-`;
    }
  }
  return null;
}

function buildPastEventServerQuery({ branchId, scopedEventId, filters, bounds, constrainedEventIds }) {
  const {
    search = "",
    quickFilter = "all",
    productionType = "all",
    eventStatus = "all",
    branchFilter = "all",
    dateFrom = "",
    dateTo = "",
  } = filters;

  if (quickFilter === "today" || quickFilter === "upcoming_events" || quickFilter === "regular_only") {
    return null;
  }
  if (productionType === "regular") {
    return null;
  }
  if (eventStatus === "cancelled") {
    return null;
  }
  if (Array.isArray(constrainedEventIds) && constrainedEventIds.length === 0) {
    return null;
  }

  const effectiveBranch = branchId || (branchFilter !== "all" ? branchFilter : null);
  const query = {
    production_batch_count: { $gt: 0 },
  };

  if (effectiveBranch) {
    query.branch_id = effectiveBranch;
  }

  if (scopedEventId) {
    query.id = scopedEventId;
  } else if (Array.isArray(constrainedEventIds)) {
    query.id = { $in: constrainedEventIds };
  }

  if (eventStatus !== "all") {
    query.status = eventStatus === "quoted" ? { $in: ["quoted", "enquiry", "deposit_pending", "deposit_pending_verification"] } : eventStatus;
  } else {
    query.status = { $ne: "cancelled" };
  }

  // Date bounds: past completed events strictly have event_date < today
  let minDate = dateFrom || "";
  let maxDate = dateTo || "";

  if (quickFilter === "this_week") {
    if (!minDate || bounds.weekStart > minDate) minDate = bounds.weekStart;
    if (!maxDate || bounds.weekEnd < maxDate) maxDate = bounds.weekEnd;
  } else if (quickFilter === "this_month") {
    if (!minDate || bounds.monthStart > minDate) minDate = bounds.monthStart;
    if (!maxDate || bounds.monthEnd < maxDate) maxDate = bounds.monthEnd;
  }

  if (minDate && minDate >= bounds.today) {
    return null;
  }

  const dateCond = { $lt: bounds.today };
  if (minDate) dateCond.$gte = minDate;
  if (maxDate) dateCond.$lte = maxDate;
  query.event_date = dateCond;

  const trimmed = search.trim();
  if (trimmed && !Array.isArray(constrainedEventIds)) {
    const ci = toCaseInsensitiveRegex(trimmed);
    const dateHint = parseDateSearchHint(trimmed);
    const orClauses = [
      { event_name: { $regex: ci } },
      { client_name: { $regex: ci } },
      { event_code: { $regex: ci } },
      { client_phone: { $regex: escapeRegex(trimmed) } },
      { event_date: { $regex: escapeRegex(trimmed) } },
    ];
    if (dateHint) {
      orClauses.push({ event_date: { $regex: escapeRegex(dateHint) } });
    }
    query.$or = orClauses;
  }

  return query;
}

function buildOrderServerQuery({ effectiveBranch, filters, bounds, includeSearch = false }) {
  const {
    search = "",
    batchStatus = "all",
    productionType = "all",
    recipeId = "all",
    dateFrom = "",
    dateTo = "",
    quickFilter = "all",
  } = filters;

  const orderQuery = {
    catering_event_id: { $exists: true, $ne: "" },
  };

  if (effectiveBranch) {
    orderQuery.branch_id = effectiveBranch;
  }
  if (recipeId !== "all") {
    orderQuery.recipe_id = recipeId;
  }
  if (batchStatus !== "all") {
    orderQuery.status =
      batchStatus === "active" ? { $in: ["pending", "in_progress"] } : batchStatus;
  }
  if (productionType === "sub_recipe") {
    orderQuery.production_stage = "sub_recipe";
  }

  let minDate = dateFrom || "";
  let maxDate = dateTo || "";
  if (quickFilter === "this_week") {
    if (!minDate || bounds.weekStart > minDate) minDate = bounds.weekStart;
    if (!maxDate || bounds.weekEnd < maxDate) maxDate = bounds.weekEnd;
  } else if (quickFilter === "this_month") {
    if (!minDate || bounds.monthStart > minDate) minDate = bounds.monthStart;
    if (!maxDate || bounds.monthEnd < maxDate) maxDate = bounds.monthEnd;
  }

  const dateCond = { $lt: bounds.today };
  if (minDate) dateCond.$gte = minDate;
  if (maxDate) dateCond.$lte = maxDate;
  orderQuery.needed_by_date = dateCond;

  const trimmed = search.trim();
  if (includeSearch && trimmed) {
    const ci = toCaseInsensitiveRegex(trimmed);
    const dateHint = parseDateSearchHint(trimmed);
    const orClauses = [
      { recipe_name: { $regex: ci } },
      { output_item_name: { $regex: ci } },
      { catering_event_name: { $regex: ci } },
      { needed_by_date: { $regex: escapeRegex(trimmed) } },
    ];
    if (dateHint) {
      orClauses.push({ needed_by_date: { $regex: escapeRegex(dateHint) } });
    }
    orderQuery.$or = orClauses;
  }

  return orderQuery;
}

function matchesOrderFilters(order, filters) {
  const { batchStatus = "all", productionType = "all", recipeId = "all", branchFilter = "all" } = filters;
  if (branchFilter !== "all" && order.branch_id !== branchFilter) return false;
  if (batchStatus !== "all") {
    if (batchStatus === "active" && order.status !== "pending" && order.status !== "in_progress") return false;
    if (batchStatus !== "active" && order.status !== batchStatus) return false;
  }
  if (recipeId !== "all" && order.recipe_id !== recipeId) return false;
  if (productionType === "regular") return false;
  if (productionType === "sub_recipe" && order.production_stage !== "sub_recipe" && !order.parent_production_order_id) {
    return false;
  }
  return true;
}

/**
 * Paginated server-side loader for Past Completed Catering Events and their production batches.
 * Uses strictly bounded server queries (aggregate + cursor pagination of `pageSize` events per page)
 * without 500-record candidate scans, and loads related ProductionOrder + CateringReservation rows
 * strictly for each page's loaded event IDs via cursor pagination.
 */
export function usePastCompletedEventPages({
  selectedBranchId,
  scopedEventId,
  filters,
  bounds,
  pageSize = PAST_EVENTS_PAGE_SIZE,
}) {
  const effectiveBranch = selectedBranchId || (filters.branchFilter !== "all" ? filters.branchFilter : null);
  const needsOrderLevelConstraint =
    filters.recipeId !== "all" ||
    filters.batchStatus !== "all" ||
    filters.productionType === "sub_recipe";
  const hasSearch = Boolean(filters.search?.trim());

  // Resolve matching event IDs on the server via aggregate (no 500-record candidate scan)
  const { data: constrainedState, isLoading: loadingConstraints } = useQuery({
    queryKey: [
      "pastProdOrderConstraints",
      effectiveBranch,
      scopedEventId,
      filters.recipeId,
      filters.batchStatus,
      filters.productionType,
      filters.eventStatus,
      filters.quickFilter,
      filters.dateFrom,
      filters.dateTo,
      filters.search,
      bounds.today,
    ],
    enabled: needsOrderLevelConstraint || hasSearch,
    queryFn: async () => {
      const baseOrderQuery = buildOrderServerQuery({
        effectiveBranch,
        filters,
        bounds,
        includeSearch: false,
      });

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

      // Search is active: combine server-side aggregate over matching batches + server-side aggregate over matching events
      const searchOrderQuery = buildOrderServerQuery({
        effectiveBranch,
        filters,
        bounds,
        includeSearch: true,
      });
      const eventSearchQuery = buildPastEventServerQuery({
        branchId: selectedBranchId,
        scopedEventId,
        filters,
        bounds,
        constrainedEventIds: null,
      });

      const [orderSearchAgg, eventSearchAgg, constraintOrderAgg] = await Promise.all([
        base44.entities.ProductionOrder.aggregate({
          query: searchOrderQuery,
          groupBy: "catering_event_id",
        }),
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
    needsOrderLevelConstraint || hasSearch ? constrainedState?.eventIds : null;

  const serverQuery = useMemo(
    () =>
      buildPastEventServerQuery({
        branchId: selectedBranchId,
        scopedEventId,
        filters,
        bounds,
        constrainedEventIds,
      }),
    [selectedBranchId, scopedEventId, filters, bounds, constrainedEventIds]
  );

  const queryEnabled =
    serverQuery !== null &&
    (!(needsOrderLevelConstraint || hasSearch) || constrainedState !== undefined);

  // Server-side count & total batch sum for the header badge
  const { data: pastTotals } = useQuery({
    queryKey: [
      "pastCompletedEventTotals",
      serverQuery,
      needsOrderLevelConstraint,
      constrainedState?.batchCountByEvent,
    ],
    enabled: queryEnabled,
    queryFn: async () => {
      if (!serverQuery) return { eventCount: 0, batchCount: 0 };
      const agg = await base44.entities.CateringEvent.aggregate({
        query: serverQuery,
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

  // Server-side cursor pagination over past CateringEvent records
  const {
    data: pagesData,
    isLoading: loadingPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "pastCompletedEventsPages",
      serverQuery,
      pageSize,
      filters.batchStatus,
      filters.recipeId,
      filters.productionType,
    ],
    enabled: queryEnabled,
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const pageResult = await base44.entities.CateringEvent.filter(serverQuery, {
        sort: "-event_date",
        limit: pageSize,
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

      // Scoped server-side filter for the current page's event IDs, using cursor pagination per page
      const pageOrderQuery = {
        catering_event_id: { $in: eventIds },
      };
      if (filters.recipeId !== "all") {
        pageOrderQuery.recipe_id = filters.recipeId;
      }
      if (filters.batchStatus !== "all") {
        pageOrderQuery.status =
          filters.batchStatus === "active"
            ? { $in: ["pending", "in_progress"] }
            : filters.batchStatus;
      }
      if (filters.productionType === "sub_recipe") {
        pageOrderQuery.production_stage = "sub_recipe";
      }

      const fetchScopedAll = async (entity, query, chunkLimit) => {
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
      };

      const [pageOrders, pageReservations] = await Promise.all([
        fetchScopedAll(base44.entities.ProductionOrder, pageOrderQuery, pageSize * 5),
        fetchScopedAll(
          base44.entities.CateringReservation,
          { event_id: { $in: eventIds }, purpose: "production_input" },
          pageSize * 10
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

  const { pastGroups, reservationsByEventId, loadedBatchCount } = useMemo(() => {
    const groups = [];
    const resMap = new Map();
    let batchSum = 0;

    for (const page of pagesData?.pages || []) {
      for (const [evId, resList] of Object.entries(page.reservationsByEventId || {})) {
        resMap.set(evId, resList);
      }
      for (const ev of page.events || []) {
        const rawOrders = page.ordersByEventId?.[ev.id] || [];
        let visibleOrders = rawOrders.filter((o) => matchesOrderFilters(o, filters));

        if (filters.search?.trim()) {
          const eventMatched = fuzzyMatchText(
            filters.search,
            ev.event_name,
            ev.event_code,
            ev.client_name,
            ev.client_phone,
            ev.event_date
          );
          if (!eventMatched) {
            const matchingSub = visibleOrders.filter((o) =>
              fuzzyMatchText(filters.search, o.recipe_name, o.output_item_name, o.needed_by_date)
            );
            if (matchingSub.length > 0) visibleOrders = matchingSub;
          }
        }

        if (visibleOrders.length === 0) continue;

        batchSum += visibleOrders.length;
        groups.push({
          key: ev.id,
          isUnlinked: false,
          isCompleted: true,
          isDatePassed: true,
          isPastCompleted: true,
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
    }

    return {
      pastGroups: groups,
      reservationsByEventId: resMap,
      loadedBatchCount: batchSum,
    };
  }, [pagesData, filters]);

  return {
    pastGroups,
    pastReservationsByEventId: reservationsByEventId,
    totalPastEvents: pastTotals?.eventCount ?? pastGroups.length,
    totalPastBatches: pastTotals?.batchCount ?? loadedBatchCount,
    loadedBatchCount,
    isLoadingPast: loadingConstraints || loadingPages,
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    fetchNextPage,
  };
}