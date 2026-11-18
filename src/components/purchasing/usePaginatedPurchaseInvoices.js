import { useState, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { toCaseInsensitiveRegex } from "@/components/admin/production/fuzzyProductionSearch";

export const PURCHASE_INVOICES_PAGE_SIZE = 10;

export function buildPurchaseInvoicesWhere({
  branchId,
  statusFilter = "all",
  supplierFilter = "",
  search = "",
  dateFrom = "",
  dateTo = "",
}) {
  const clauses = [];

  if (dateFrom || dateTo) {
    clauses.push({ invoice_date: { ...(dateFrom ? { $gte: dateFrom } : {}), ...(dateTo ? { $lte: dateTo } : {}) } });
  }

  if (branchId) {
    clauses.push({ branch_id: branchId });
  } else {
    clauses.push({ branch_id: { $nin: ["", null], $exists: true } });
  }

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "posted") {
      clauses.push({
        $or: [{ status: "posted" }, { status: null }, { status: { $exists: false } }],
      });
    } else {
      clauses.push({ status: statusFilter });
    }
  }

  const supplierQ = supplierFilter.trim();
  if (supplierQ) {
    clauses.push({
      supplier_name: { $regex: toCaseInsensitiveRegex(supplierQ) },
    });
  }

  const searchQ = search.trim();
  if (searchQ) {
    const ci = toCaseInsensitiveRegex(searchQ);
    clauses.push({
      $or: [
        { invoice_number: { $regex: ci } },
        { supplier_name: { $regex: ci } },
        { notes: { $regex: ci } },
      ],
    });
  }

  if (clauses.length === 0) return {};
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export default function usePaginatedPurchaseInvoices({
  branchId,
  statusFilter = "all",
  supplierFilter = "",
  search = "",
  dateFrom = "",
  dateTo = "",
  sort = "-created_date",
  pageSize = PURCHASE_INVOICES_PAGE_SIZE,
}) {
  const debouncedSupplier = useDebouncedValue(supplierFilter.trim(), 250);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const where = useMemo(
    () =>
      buildPurchaseInvoicesWhere({
        branchId,
        statusFilter,
        supplierFilter: debouncedSupplier,
        search: debouncedSearch,
        dateFrom,
        dateTo,
      }),
    [branchId, statusFilter, debouncedSupplier, debouncedSearch, dateFrom, dateTo]
  );

  const filterKey = useMemo(
    () =>
      JSON.stringify([
        branchId || null,
        statusFilter || "all",
        debouncedSupplier,
        debouncedSearch,
        dateFrom,
        dateTo,
        sort,
      ]),
    [branchId, statusFilter, debouncedSupplier, debouncedSearch, dateFrom, dateTo, sort]
  );

  const [pageState, setPageState] = useState({ key: filterKey, page: 0 });
  const currentPage = pageState.key === filterKey ? pageState.page : 0;
  const setPage = (nextPage) => setPageState({ key: filterKey, page: nextPage });

  const { data: totalCount = 0, isLoading: countLoading } = useQuery({
    queryKey: ["purchaseInvoices", "count", where],
    queryFn: () => base44.entities.PurchaseInvoice.count(where),
  });

  const pagesQuery = useInfiniteQuery({
    queryKey: ["purchaseInvoices", "paged", where, sort, pageSize],
    queryFn: ({ pageParam }) =>
      base44.entities.PurchaseInvoice.filter(where, {
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