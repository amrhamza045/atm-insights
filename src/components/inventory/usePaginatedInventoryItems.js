import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { toCaseInsensitiveRegex } from "@/components/admin/production/fuzzyProductionSearch";

export const INVENTORY_ITEMS_PAGE_SIZE = 12;

export function buildInventoryItemsWhere({
  branchId,
  categoryId,
  search = "",
  categories = [],
}) {
  const clauses = [];

  if (branchId) {
    clauses.push({ branch_id: branchId });
  }

  if (categoryId) {
    clauses.push({ category_id: categoryId });
  }

  const q = search.trim();
  if (q) {
    const ci = toCaseInsensitiveRegex(q);
    const lowerQ = q.toLowerCase();
    const orClauses = [
      { name: { $regex: ci } },
      { arabic_name: { $regex: ci } },
      { category_name: { $regex: ci } },
      { supplier: { $regex: ci } },
      { storage_location_name: { $regex: ci } },
      { unit: { $regex: ci } },
      { purchase_unit: { $regex: ci } },
      { purchase_unit_label: { $regex: ci } },
      { selling_unit: { $regex: ci } },
      { selling_unit_label: { $regex: ci } },
      { expiry_date: { $regex: ci } },
      { branch_name: { $regex: ci } },
    ];

    const matchingCategoryIds = categories
      .filter((c) => (c.name || "").toLowerCase().includes(lowerQ))
      .map((c) => c.id)
      .filter(Boolean);
    if (matchingCategoryIds.length > 0) {
      orClauses.push({ category_id: { $in: matchingCategoryIds } });
    }

    const numVal = Number(q);
    if (Number.isFinite(numVal)) {
      orClauses.push(
        { quantity: numVal },
        { low_stock_threshold: numVal },
        { cost_per_unit: numVal },
        { lead_time_days: numVal }
      );
    }

    clauses.push({ $or: orClauses });
  }

  if (clauses.length === 0) return {};
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export default function usePaginatedInventoryItems({
  branchId,
  categoryId = "",
  search = "",
  categories = [],
  sort = "-created_date",
  pageSize = INVENTORY_ITEMS_PAGE_SIZE,
}) {
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const where = useMemo(
    () =>
      buildInventoryItemsWhere({
        branchId,
        categoryId,
        search: debouncedSearch,
        categories,
      }),
    [branchId, categoryId, debouncedSearch, categories]
  );

  const filterKey = useMemo(
    () =>
      JSON.stringify([
        branchId || null,
        categoryId || "",
        debouncedSearch,
        sort,
      ]),
    [branchId, categoryId, debouncedSearch, sort]
  );

  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const currentPage = pageState.key === filterKey ? pageState.page : 0;
  const setPage = (nextPage) => setPageState({ key: filterKey, page: nextPage });

  const { data: totalCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ["inventoryItems", "count", where],
    queryFn: () => base44.entities.InventoryItem.count(where),
  });

  const pagesQuery = useInfiniteQuery({
    queryKey: [
      "inventoryItems",
      "paged",
      where,
      sort,
      pageSize,
    ],
    queryFn: ({ pageParam }) =>
      base44.entities.InventoryItem.filter(where, {
        sort,
        limit: pageSize,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null,
    getNextPageParam: (last) =>
      last?.has_more && last?.next_cursor ? last.next_cursor : undefined,
  });

  const { data: filteredAllItems = [] } = useQuery({
    queryKey: ["inventoryItems", "filtered-all", where, sort],
    queryFn: () => base44.entities.InventoryItem.filter(where, sort, 1000),
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
    filteredAllItems,
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