import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import AllEventsFrame from "./AllEventsFrame";
import EventListFilters from "./EventListFilters";
import AllConfirmRow from "./AllConfirmRow";
import { useEventsList } from "./useFilteredList";

const READINESS = [
  ["all", "All events"], ["ready", "Ready to start"], ["started", "Operations started"],
  ["completed", "Completed"], ["waiting", "Not confirmed yet"], ["cancelled", "Cancelled"],
];
const QUERY = {
  ready: { status: "confirmed" },
  started: { status: "in_progress" },
  completed: { status: "completed" },
  waiting: { status: { $nin: ["confirmed", "in_progress", "completed", "cancelled"] } },
  cancelled: { status: "cancelled" },
};

/** Confirm & Start tab with no event picked: where every event stands on starting operations. */
export default function AllConfirmList() {
  const [filters, setFilters] = useState({ search: "", when: "upcoming", status: "all" });
  const list = useEventsList(filters, QUERY[filters.status] || {});

  return (
    <AllEventsFrame
      title="Confirm & Start for all events"
      list={list}
      empty="No events match these filters."
      filters={<EventListFilters value={filters} onChange={setFilters} options={READINESS} />}
      summary={
        <p className="text-xs text-amber-700">
          Opening a confirmed event starts its operations automatically: its quote is locked, equipment is reserved and materials are allocated.
        </p>
      }
    >
      <Card className="divide-y">
        {list.rows.map((e) => <AllConfirmRow key={e.id} event={e} />)}
      </Card>
    </AllEventsFrame>
  );
}