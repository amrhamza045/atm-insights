import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const COST_ANALYSIS_PAGE_SIZE = 10;

export function buildCostAnalysisWhere({ branchId }) {
  const clauses = [{ "recipe.0": { $exists: true } }];
  if (branchId) {
    clauses.push({ branch_id: { $in: [branchId, null, ""] } });
  }
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export function analyzeMenuItemCost(item, inventoryById, defaultTargetMargin) {
  const recipe = Array.isArray(item.recipe) ? item.recipe : [];
  const totalCost = recipe.reduce((sum, ingredient) => {
    const invItem = inventoryById.get(ingredient.inventory_item_id);
    if (invItem && invItem.cost_per_unit) {
      return sum + invItem.cost_per_unit * ingredient.quantity_needed;
    }
    return sum;
  }, 0);

  const actualMargin = item.price
    ? ((item.price - totalCost) / item.price) * 100
    : 0;
  const targetMargin =
    item.target_margin_percentage ?? defaultTargetMargin ?? null;
  const needsReview = targetMargin != null && actualMargin < targetMargin;

  return {
    ...item,
    totalCost,
    actualMargin,
    targetMargin,
    needsReview,
    marginDiff: targetMargin != null ? actualMargin - targetMargin : 0,
  };
}

export default function usePaginatedCostAnalysis({
  branchId,
  sort = "name",
}) {
  const where = useMemo(() => buildCostAnalysisWhere({ branchId }), [branchId]);
  const filterKey = useMemo(
    () => JSON.stringify([branchId || null, sort]),
    [branchId, sort]
  );

  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const currentPage = pageState.key === filterKey ? pageState.page : 0;
  const setPage = (nextPage) => setPageState({ key: filterKey, page: nextPage });

  const { data: inventoryItems = [], isLoading: invLoading } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: () => base44.entities.InventoryItem.list("name", 1000),
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({
        setting_key: "default",
      });
      return result[0] || null;
    },
  });

  const { data: totalCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ["menuItems", "cost-analysis-count", where],
    queryFn: () => base44.entities.MenuItem.count(where),
  });

  const pagesQuery = useInfiniteQuery({
    queryKey: [
      "menuItems",
      "cost-analysis-paged",
      where,
      sort,
      COST_ANALYSIS_PAGE_SIZE,
    ],
    queryFn: ({ pageParam }) =>
      base44.entities.MenuItem.filter(where, {
        sort,
        limit: COST_ANALYSIS_PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null,
    getNextPageParam: (last) =>
      last?.has_more && last?.next_cursor ? last.next_cursor : undefined,
  });

  const { data: allRecipeMenuItems = [] } = useQuery({
    queryKey: ["menuItems", "cost-analysis-all", where, sort],
    queryFn: () => base44.entities.MenuItem.filter(where, sort, 500),
  });

  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((i) => [i.id, i])),
    [inventoryItems]
  );

  const defaultTargetMargin =
    settings?.overall_restaurant_margin_percentage ?? null;

  const loadedPages = pagesQuery.data?.pages || [];
  const safePage =
    loadedPages.length > 0 ? Math.min(currentPage, loadedPages.length - 1) : 0;
  const rawPageItems = loadedPages[safePage]?.items || [];

  const pagedItems = useMemo(
    () =>
      rawPageItems.map((item) =>
        analyzeMenuItemCost(item, inventoryById, defaultTargetMargin)
      ),
    [rawPageItems, inventoryById, defaultTargetMargin]
  );

  const summaryData = useMemo(() => {
    const analyzedAll = allRecipeMenuItems.map((item) =>
      analyzeMenuItemCost(item, inventoryById, defaultTargetMargin)
    );
    const needsReviewItems = analyzedAll.filter((i) => i.needsReview);
    const avgMargin =
      analyzedAll.length > 0
        ? analyzedAll.reduce((sum, i) => sum + i.actualMargin, 0) /
          analyzedAll.length
        : 0;
    return {
      needsReviewItems,
      avgMargin,
    };
  }, [allRecipeMenuItems, inventoryById, defaultTargetMargin]);

  const totalPages = Math.max(
    1,
    Math.ceil((totalCount || pagedItems.length) / COST_ANALYSIS_PAGE_SIZE)
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
    items: pagedItems,
    needsReviewItems: summaryData.needsReviewItems,
    avgMargin: summaryData.avgMargin,
    settings,
    totalCount,
    page: safePage,
    totalPages,
    pageSize: COST_ANALYSIS_PAGE_SIZE,
    hasNextPage,
    hasPrevPage,
    filterKey,
    isLoading:
      pagesQuery.isLoading || countLoading || invLoading || settingsLoading,
    isFetchingPage: pagesQuery.isFetchingNextPage,
    goToNextPage: () => goToPage(safePage + 1),
    goToPrevPage: () => {
      if (safePage > 0) setPage(safePage - 1);
    },
    goToPage,
  };
}