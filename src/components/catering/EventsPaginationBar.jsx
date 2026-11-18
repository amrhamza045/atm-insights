import React, { useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages = new Set([0, totalPages - 1, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 2) {
    pages.add(1);
    pages.add(2);
    pages.add(3);
  }
  if (currentPage >= totalPages - 3) {
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
    pages.add(totalPages - 4);
  }
  const sorted = Array.from(pages)
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => a - b);
  const items = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      items.push("ellipsis-" + sorted[i - 1]);
    }
    items.push(sorted[i]);
  }
  return items;
}

export default function EventsPaginationBar({
  page,
  totalPages,
  pageSize,
  currentCount,
  totalCount,
  itemLabel = "events",
  secondarySummary = null,
  hasPrevPage,
  hasNextPage,
  isFetchingPage,
  onPrevPage,
  onNextPage,
  onGoToPage,
  scrollTargetRef = null,
}) {
  const scrollAnimRef = useRef(null);
  const pendingScrollRef = useRef(false);
  const prevPageRef = useRef(page);

  const runSpringScroll = () => {
    if (typeof window === "undefined") return;
    scrollAnimRef.current?.stop?.();

    const headerOffset = 80;
    const targetEl = scrollTargetRef?.current;
    const targetY = targetEl
      ? Math.max(0, targetEl.getBoundingClientRect().top + window.scrollY - headerOffset)
      : 0;
    const startY = window.scrollY || document.documentElement.scrollTop || 0;

    if (Math.abs(startY - targetY) < 4) return;

    const cancelOnUserScroll = () => {
      scrollAnimRef.current?.stop?.();
      window.removeEventListener("wheel", cancelOnUserScroll);
      window.removeEventListener("touchstart", cancelOnUserScroll);
    };

    window.addEventListener("wheel", cancelOnUserScroll, { passive: true, once: true });
    window.addEventListener("touchstart", cancelOnUserScroll, { passive: true, once: true });

    scrollAnimRef.current = animate(startY, targetY, {
      type: "spring",
      stiffness: 260,
      damping: 28,
      mass: 0.7,
      onUpdate: (latest) => {
        window.scrollTo(0, latest);
      },
      onComplete: () => {
        window.removeEventListener("wheel", cancelOnUserScroll);
        window.removeEventListener("touchstart", cancelOnUserScroll);
      },
    });
  };

  useEffect(() => {
    if (prevPageRef.current !== page) {
      prevPageRef.current = page;
      if (pendingScrollRef.current) {
        pendingScrollRef.current = false;
        runSpringScroll();
      }
    }
  }, [page]);

  useEffect(() => {
    return () => {
      scrollAnimRef.current?.stop?.();
    };
  }, []);

  const triggerWithSpringScroll = (action) => {
    if (!action) return;
    pendingScrollRef.current = true;
    runSpringScroll();
    action();
  };

  const total = totalCount || currentCount;
  if (total === 0) return null;
  const start = page * pageSize + 1;
  const end = Math.min(page * pageSize + currentCount, total);
  const pageItems = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <p>
          Showing <span className="font-medium text-slate-900">{start}</span> to{" "}
          <span className="font-medium text-slate-900">{end}</span> of{" "}
          <span className="font-medium text-slate-900">{total}</span> {itemLabel}
        </p>
        {secondarySummary && (
          <span className="text-xs text-slate-500">· {secondarySummary}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerWithSpringScroll(onPrevPage)}
          disabled={!hasPrevPage || isFetchingPage}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {onGoToPage && totalPages > 1 && (
          <div className="flex items-center gap-1">
            {pageItems.map((item) =>
              typeof item === "string" ? (
                <span key={item} className="px-1.5 text-xs text-slate-400 select-none">
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === page ? "default" : "outline"}
                  size="sm"
                  disabled={isFetchingPage}
                  onClick={() => {
                    if (item !== page) {
                      triggerWithSpringScroll(() => onGoToPage(item));
                    }
                  }}
                  className={`h-8 min-w-[2rem] px-2 text-xs ${
                    item === page
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "text-slate-700"
                  }`}
                >
                  {item + 1}
                </Button>
              )
            )}
          </div>
        )}

        <span className="px-2 text-sm font-medium text-slate-700">
          Page {page + 1} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerWithSpringScroll(onNextPage)}
          disabled={!hasNextPage || isFetchingPage}
          className="gap-1"
        >
          {isFetchingPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}