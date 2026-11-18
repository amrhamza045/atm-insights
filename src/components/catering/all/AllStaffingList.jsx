import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import AllEventsFrame from "./AllEventsFrame";
import EventListFilters from "./EventListFilters";
import AllStaffingRow from "./AllStaffingRow";
import { useEventsList } from "./useFilteredList";
import { enumFilter } from "./allEventsQuery";

const STAFFING = [
  ["all", "All staffing"], ["none", "No plan yet"], ["planned", "Planned"],
  ["partially_staffed", "Partially staffed"], ["fully_staffed", "Fully staffed"],
];

/** Staffing tab with no event picked: every event's crew coverage and labor estimate. */
export default function AllStaffingList() {
  const [filters, setFilters] = useState({ search: "", when: "upcoming", status: "all" });
  const list = useEventsList(filters, enumFilter("staffing_status", filters.status, STAFFING));

  return (
    <AllEventsFrame
      title="Staffing for all events"
      list={list}
      empty="No events match these filters."
      filters={<EventListFilters value={filters} onChange={setFilters} options={STAFFING} />}
    >
      <Card className="divide-y">
        {list.rows.map((e) => <AllStaffingRow key={e.id} event={e} />)}
      </Card>
    </AllEventsFrame>
  );
}