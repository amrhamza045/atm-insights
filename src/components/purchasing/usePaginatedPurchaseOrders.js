import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { toCaseInsensitiveRegex } from "@/components/admin/production/fuzzyProductionSearch";

export const PURCHASE_ORDERS_PAGE_SIZE = 10;

export function buildPurchaseOrdersWhere({
  branchId,
  statusFilter = "all",
  supplierFilter = "",
  categoryFilter = "",
  scopedEventId = null,
}) {
  const clauses = [];

  // Orders with no branch stamped (e.g., catering shortfall POs raised for an event
  // with no branch) stay visible alongside the active branch.
  if (branchId) {
    clauses.push({ branch_id: { $in: [branchId, null, ""] } });
  }

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "rfq") {
      clauses.push({ rfq_status: { $in: ["open", "quoted"] } });
    } else if (statusFilter === "pending_approval") {
      clauses.push({
        status: "pending_approval",
        rfq_status: { $nin: ["open", "quoted"] },
      });
    } else {
      clauses.push({ status: statusFilter });
    }
  }

  const supplierQ = supplierFilter.trim();
  if (supplierQ) {
    clauses.push({ supplier: { $regex: toCaseInsensitiveRegex(supplierQ) } });
  }

  const categoryQ = categoryFilter.trim();
  if (categoryQ) {
    clauses.push({
      inventory_category_name: { $regex: toCaseInsensitiveRegex(categoryQ) },
    });
  }

  if (scopedEventId) {
    clauses.push({
      $or: [
        { catering_event_id: scopedEventId },
        { catering_event_ids: scopedEventId },
      ],
    });
  }

  if (clauses.length === 0) return {};
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export default function usePaginatedPurchaseOrders({
  branchId,
  statusFilter = "all",
  supplierFilter = "",
  categoryFilter = "",
  scopedEventId = null,
  sort = "-created_date",
  pageSize = PURCHASE_ORDERS_PAGE_SIZE,
}) {
  const debouncedSupplier = useDebouncedValue(supplierFilter.trim(), 250);
  const debouncedCategory = useDebouncedValue(categoryFilter.trim(), 250);

  const where = useMemo(
    () =>
      buildPurchaseOrdersWhere({
        branchId,
        statusFilter,
        supplierFilter: debouncedSupplier,
        categoryFilter: debouncedCategory,
        scopedEventId,
      }),
    [branchId, statusFilter, debouncedSupplier, debouncedCategory, scopedEventId]
  );

  const filterKey = useMemo(
    () =>
      JSON.stringify([
        branchId || null,
        statusFilter || "all",
        debouncedSupplier,
        debouncedCategory,
        scopedEventId || null,
        sort,
      ]),
    [branchId, statusFilter, debouncedSupplier, debouncedCategory, scopedEventId, sort]
  );

  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const currentPage = pageState.key === filterKey ? pageState.page : 0;
  const setPage = (nextPage) => setPageState({ key: filterKey, page: nextPage });

  const { data: totalCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ["purchaseOrders", "count", where],
    queryFn: () => base44.entities.PurchaseOrder.count(where),
  });

  const pagesQuery = useInfiniteQuery({
    queryKey: ["purchaseOrders", "paged", where, sort, pageSize],
    queryFn: ({ pageParam }) =>
      base44.entities.PurchaseOrder.filter(where, {
        sort,
        limit: pageSize,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null,
    getNextPageParam: (last) =>
      last?.has_more && last?.next_cursor ? last.next_cursor : undefined,
  });

  const loadedPages = pagesQuery.data?.pages || [];
  const safePage =
    loadedPages.length > 0 ? Math.min(currentPage, loadedPages.length - 1) : 0;
  const items = loadedPages[safePage]?.items || [];

  const totalPages = Math.max(
    1,
    Math.ceil((totalCount || items.length) / pageSize)
  );
  const hasNextPage =
    safePage + 1 < loadedPages.length || Boolean(pagesQuery.hasNextPage);
  const hasPrevPage = safePage > 0;

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
    items,
    totalCount,
    page: safePage,
    totalPages,
    pageSize,
    hasNextPage,
    hasPrevPage,
    filterKey,
    isLoading: pagesQuery.isLoading || countLoading,
    isFetchingPage: pagesQuery.isFetchingNextPage,
    goToNextPage: () => goToPage(safePage + 1),
    goToPrevPage: () => {
      if (safePage > 0) setPage(safePage - 1);
    },
    goToPage,
  };
}