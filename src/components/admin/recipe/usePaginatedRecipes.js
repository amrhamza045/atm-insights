import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const RECIPES_PAGE_SIZE = 10;

export function buildRecipesServerQuery(branchId) {
  if (!branchId) return {};
  return { branch_id: { $in: [branchId, null, ""] } };
}

export default function usePaginatedRecipes({ branchId, sort = "-created_date" }) {
  const where = useMemo(() => buildRecipesServerQuery(branchId), [branchId]);
  const filterKey = useMemo(() => JSON.stringify([branchId || null, sort]), [branchId, sort]);

  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const currentPage = pageState.key === filterKey ? pageState.page : 0;
  const setPage = (nextPage) => setPageState({ key: filterKey, page: nextPage });

  const { data: totalCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ["recipes", "count", where],
    queryFn: () => base44.entities.Recipe.count(where),
  });

  const pagesQuery = useInfiniteQuery({
    queryKey: ["recipes", "paged", where, sort, RECIPES_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      base44.entities.Recipe.filter(where, {
        sort,
        limit: RECIPES_PAGE_SIZE,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null,
    getNextPageParam: (last) =>
      last?.has_more && last?.next_cursor ? last.next_cursor : undefined,
  });

  const loadedPages = pagesQuery.data?.pages || [];
  const safePage =
    loadedPages.length > 0 ? Math.min(currentPage, loadedPages.length - 1) : 0;
  const recipes = loadedPages[safePage]?.items || [];
  const totalPages = Math.max(
    1,
    Math.ceil((totalCount || recipes.length) / RECIPES_PAGE_SIZE)
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
    recipes,
    totalCount,
    page: safePage,
    totalPages,
    pageSize: RECIPES_PAGE_SIZE,
    hasNextPage,
    hasPrevPage,
    isLoading: pagesQuery.isLoading || countLoading,
    isFetchingPage: pagesQuery.isFetchingNextPage,
    goToNextPage: () => goToPage(safePage + 1),
    goToPrevPage: () => {
      if (safePage > 0) setPage(safePage - 1);
    },
    goToPage,
  };
}