import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import AllEventsFrame from "./AllEventsFrame";
import EventListFilters from "./EventListFilters";
import AllPlanningRow from "./AllPlanningRow";
import { useEventsList } from "./useFilteredList";
import { enumFilter } from "./allEventsQuery";

const RESERVATIONS = [
  ["all", "All reservations"], ["none", "Not planned yet"], ["pending_approval", "Awaiting approval"],
  ["reserved", "Reserved"], ["shortfall", "Shortfall"], ["released", "Released"],
];

/** Planning tab with no event picked: every event's reservations, production and procurement. */
export default function AllPlanningList() {
  const [filters, setFilters] = useState({ search: "", when: "upcoming", status: "all" });
  const list = useEventsList(filters, enumFilter("reservation_status", filters.status, RESERVATIONS));

  return (
    <AllEventsFrame
      title="Planning for all events"
      list={list}
      empty="No events match these filters."
      filters={<EventListFilters value={filters} onChange={setFilters} options={RESERVATIONS} />}
    >
      <Card className="divide-y">
        {list.rows.map((e) => <AllPlanningRow key={e.id} event={e} />)}
      </Card>
    </AllEventsFrame>
  );
}