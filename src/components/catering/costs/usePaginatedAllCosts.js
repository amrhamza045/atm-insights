import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { useAllocations } from "./useAllocations";
import {
  ALL_COSTS_PAGE_SIZE,
  buildEquipmentCostsWhere,
  buildStaffingCostsWhere,
  buildLogisticsCostsWhere,
} from "./allCostsQuery";

function usePagedEntityResource({
  queryKeyPrefix,
  entity,
  where,
  sort,
  resetKey,
  allocationsLoading,
  mapItem,
}) {
  const [pageState, setPageState] = useState({ key: resetKey, page: 0 });
  const currentPage = pageState.key === resetKey ? pageState.page : 0;
  const setPage = (nextPage) => setPageState({ key: resetKey, page: nextPage });

  const isImpossible = where === null;

  const { data: totalCount = 0, isLoading: countLoading } = useQuery({
    queryKey: [...queryKeyPrefix, "count", where],
    queryFn: () => (isImpossible ? 0 : entity.count(where)),
    enabled: !allocationsLoading && !isImpossible,
  });

  const pagesQuery = useInfiniteQuery({
    queryKey: [...queryKeyPrefix, "paged", where, sort, ALL_COSTS_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      entity.filter(where, {
        sort,
        limit: ALL_COSTS_PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null,
    getNextPageParam: (last) =>
      last?.has_more && last?.next_cursor ? last.next_cursor : undefined,
    enabled: !allocationsLoading && !isImpossible,
  });

  const loadedPages = isImpossible ? [] : pagesQuery.data?.pages || [];
  const safePage =
    loadedPages.length > 0 ? Math.min(currentPage, loadedPages.length - 1) : 0;
  const rawItems = isImpossible ? [] : loadedPages[safePage]?.items || [];
  const rows = useMemo(() => rawItems.map(mapItem), [rawItems, mapItem]);

  const effectiveTotal = isImpossible ? 0 : totalCount;
  const totalPages = Math.max(
    1,
    Math.ceil((effectiveTotal || rows.length) / ALL_COSTS_PAGE_SIZE)
  );
  const hasNextPage =
    !isImpossible &&
    (safePage + 1 < loadedPages.length || Boolean(pagesQuery.hasNextPage));
  const hasPrevPage = !isImpossible && safePage > 0;

  const goToPage = async (targetPage) => {
    if (isImpossible) return;
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
    rows,
    totalCount: effectiveTotal,
    page: safePage,
    totalPages,
    pageSize: ALL_COSTS_PAGE_SIZE,
    hasNextPage,
    hasPrevPage,
    isLoading: allocationsLoading || (!isImpossible && (pagesQuery.isLoading || countLoading)),
    isFetchingPage: pagesQuery.isFetchingNextPage,
    goToNextPage: () => goToPage(safePage + 1),
    goToPrevPage: () => {
      if (safePage > 0) setPage(safePage - 1);
    },
    goToPage,
  };
}

export default function usePaginatedAllCosts({
  branchId,
  filter = { status: "all", eventId: "all", from: "", to: "" },
  search = "",
}) {
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const {
    reservations,
    maintenance,
    trips,
    staffAllocations,
    isLoading: allocationsLoading,
  } = useAllocations(filter);

  const staffRows = useMemo(() => staffAllocations(), [staffAllocations]);

  const resetKey = useMemo(
    () =>
      JSON.stringify([
        branchId || null,
        filter.status || "all",
        filter.eventId || "all",
        filter.from || "",
        filter.to || "",
        debouncedSearch,
      ]),
    [branchId, filter.status, filter.eventId, filter.from, filter.to, debouncedSearch]
  );

  const equipmentWhere = useMemo(
    () =>
      buildEquipmentCostsWhere({
        branchId,
        filter,
        search: debouncedSearch,
        reservations,
        maintenance,
      }),
    [branchId, filter, debouncedSearch, reservations, maintenance]
  );

  const staffingWhere = useMemo(
    () =>
      buildStaffingCostsWhere({
        filter,
        search: debouncedSearch,
        staffRows,
      }),
    [filter, debouncedSearch, staffRows]
  );

  const logisticsWhere = useMemo(
    () =>
      buildLogisticsCostsWhere({
        branchId,
        filter,
        search: debouncedSearch,
        trips,
      }),
    [branchId, filter, debouncedSearch, trips]
  );

  const equipmentGroup = usePagedEntityResource({
    queryKeyPrefix: ["catering-equipment", "all-costs"],
    entity: base44.entities.CateringEquipment,
    where: equipmentWhere,
    sort: "-created_date",
    resetKey,
    allocationsLoading,
    mapItem: (e) => ({
      id: `eq-${e.id}`,
      type: "Equipment",
      name: e.name,
      detail: `${e.category || "Uncategorised"} · ${
        e.cost_source === "rented" ? "Rented" : "Owned"
      }`,
      basis: `per ${e.unit_label || "pcs"} / event`,
      cost: e.usage_cost_per_event || 0,
    }),
  });

  const staffingGroup = usePagedEntityResource({
    queryKeyPrefix: ["catering-staffing-roles", "all-costs"],
    entity: base44.entities.CateringStaffingRole,
    where: staffingWhere,
    sort: "sort_order",
    resetKey,
    allocationsLoading,
    mapItem: (r) => ({
      id: `st-${r.id}`,
      type: "Staffing",
      name: r.name,
      detail: r.department || "—",
      basis: r.pay_basis === "flat_event" ? "flat per event" : "per hour",
      cost:
        r.pay_basis === "flat_event"
          ? r.default_flat_rate || 0
          : r.default_hourly_rate || 0,
    }),
  });

  const logisticsGroup = usePagedEntityResource({
    queryKeyPrefix: ["catering-vehicles", "all-costs"],
    entity: base44.entities.CateringVehicle,
    where: logisticsWhere,
    sort: "-created_date",
    resetKey,
    allocationsLoading,
    mapItem: (v) => ({
      id: `lg-${v.id}`,
      type: "Logistics",
      name: `${v.name}${v.plate_number ? ` · ${v.plate_number}` : ""}`,
      detail: (v.vehicle_type || "").replace(/_/g, " ") || "—",
      basis: v.cost_basis === "per_day" ? "per day" : "per km",
      cost: v.cost_basis === "per_day" ? v.cost_per_day || 0 : v.cost_per_km || 0,
    }),
  });

  return {
    equipmentGroup,
    staffingGroup,
    logisticsGroup,
    totalCount:
      equipmentGroup.totalCount +
      staffingGroup.totalCount +
      logisticsGroup.totalCount,
    resetKey,
  };
}