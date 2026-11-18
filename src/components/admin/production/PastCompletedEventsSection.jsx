import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { EventProductionSection } from "./EventProductionSection";

export default function PastCompletedEventsSection({
  groups = [],
  totalEvents = 0,
  totalBatches = 0,
  isLoading = false,
  isFetchingNextPage = false,
  hasNextPage = false,
  onLoadMore,
  reservationsByEventId,
  recipesById,
  recipesByOutput,
  onStart,
  onComplete,
  onCancel,
  onReconcile,
  onUpdatePrepStage,
}) {
  if (!isLoading && groups.length === 0) return null;

  const displayedEventsCount = Math.max(totalEvents, groups.length);

  return (
    <div className="pt-4 border-t border-slate-200 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle2 className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">
            Completed Events (Past Event Date)
          </h3>
          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
            Showing {groups.length} of {displayedEventsCount} event{displayedEventsCount === 1 ? "" : "s"}
            {totalBatches > 0 ? ` · ${totalBatches} batch${totalBatches === 1 ? "" : "es"}` : ""}
          </Badge>
        </div>
        <span className="text-xs text-slate-500">
          Collapsed by default — click any event to inspect its batches and custody history
        </span>
      </div>

      {isLoading && groups.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500 bg-white border border-slate-200/80 rounded-xl">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          Loading completed event batches…
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.map((group) => (
            <EventProductionSection
              key={group.key}
              group={group}
              defaultOpen={false}
              reservations={reservationsByEventId?.get(group.eventId) || []}
              recipesById={recipesById}
              recipesByOutput={recipesByOutput}
              onStart={onStart}
              onComplete={onComplete}
              onCancel={onCancel}
              onReconcile={onReconcile}
              onUpdatePrepStage={onUpdatePrepStage}
            />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex flex-col items-center justify-center pt-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-sm px-5"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Loading more completed events…
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                Load More Completed Events ({Math.max(0, displayedEventsCount - groups.length)} remaining)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}