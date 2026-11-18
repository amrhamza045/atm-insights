import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { useBranch } from "@/components/branches/BranchContext";
import useAllEventsPages from "./useAllEventsPages";
import OpenEventButton from "./OpenEventButton";
import LoadMoreButton from "./LoadMoreButton";
import { whenQuery } from "./allEventsQuery";

/** Completed events in the branch (within the chosen event dates) that have no reconciliation yet. */
export default function UnreconciledEvents({ when = "all" }) {
  const { selectedBranchId } = useBranch();
  const { data: reconciledIds } = useQuery({
    queryKey: ["catering-reconciliation", "reconciled-event-ids", selectedBranchId],
    queryFn: async () => {
      const { rows } = await base44.entities.CateringReconciliation.aggregate({ query: { branch_id: selectedBranchId }, groupBy: "event_id" });
      return rows.map((r) => r.event_id).filter(Boolean);
    },
    enabled: !!selectedBranchId,
  });
  const range = whenQuery("event_date", when);
  const list = useAllEventsPages({
    entity: "CateringEvent",
    cacheKey: "catering-events",
    sort: range.sort,
    query: { status: "completed", id: { $nin: reconciledIds || [] }, ...range.query },
    enabled: !!reconciledIds,
  });
  if (list.rows.length === 0) return null;

  return (
    <Card className="p-4 border-amber-200 bg-amber-50 space-y-2">
      <p className="text-sm font-semibold text-amber-900">
        Completed events without a reconciliation ({list.total ?? list.rows.length})
      </p>
      <div className="divide-y divide-amber-200">
        {list.rows.map((ev) => (
          <div key={ev.id} className="py-2 flex items-center justify-between gap-3 text-sm text-amber-900">
            <span className="min-w-0 truncate">{ev.event_name} · {ev.event_date}</span>
            <OpenEventButton tab="reconciliation" eventId={ev.id} />
          </div>
        ))}
      </div>
      <LoadMoreButton list={list} />
    </Card>
  );
}