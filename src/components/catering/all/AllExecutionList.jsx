import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import AllEventsFrame from "./AllEventsFrame";
import EventListFilters from "./EventListFilters";
import AllExecutionRow from "./AllExecutionRow";
import { useEventsList } from "./useFilteredList";
import { enumFilter } from "./allEventsQuery";

const STATUSES = [
  ["all", "All statuses"], ["enquiry", "Enquiry"], ["quoted", "Quoted"], ["deposit_pending", "Deposit pending"],
  ["deposit_pending_verification", "Deposit being verified"], ["confirmed", "Confirmed"],
  ["in_progress", "In progress"], ["completed", "Completed"], ["cancelled", "Cancelled"],
];

/** Execution tab with no event picked: every event's day-of status, today's first. */
export default function AllExecutionList() {
  const [filters, setFilters] = useState({ search: "", when: "upcoming", status: "all" });
  const list = useEventsList(filters, enumFilter("status", filters.status, STATUSES));

  return (
    <AllEventsFrame
      title="Execution for all events"
      list={list}
      empty="No events match these filters."
      filters={<EventListFilters value={filters} onChange={setFilters} options={STATUSES} />}
    >
      <Card className="divide-y">
        {list.rows.map((e) => <AllExecutionRow key={e.id} event={e} />)}
      </Card>
    </AllEventsFrame>
  );
}