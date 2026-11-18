import React from "react";
import { Card } from "@/components/ui/card";
import { useBranch } from "@/components/branches/BranchContext";
import LoadMoreButton from "./LoadMoreButton";

/** Shared layout of the all-events lists: heading, filters, totals, rows and "Load more". */
export default function AllEventsFrame({ title, list, filters, summary, empty, children }) {
  const { selectedBranch } = useBranch();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">
            All events in {selectedBranch?.name || "this branch"}
            {list.total > 0 ? ` · showing ${list.rows.length} of ${list.total}` : ""}. Open an event to make changes.
          </p>
        </div>
        {filters}
      </div>
      {summary}
      {list.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : list.rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">{empty}</Card>
      ) : (
        children
      )}
      <LoadMoreButton list={list} />
    </div>
  );
}