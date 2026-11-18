import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { STAGE_LABELS } from "@/components/catering/logisticsLogic";
import useFilteredList from "./useFilteredList";
import AllEventsFrame from "./AllEventsFrame";
import EventListFilters from "./EventListFilters";
import AllTripRow from "./AllTripRow";
import { enumFilter } from "./allEventsQuery";

const STAGES = [["all", "All stages"], ...Object.entries(STAGE_LABELS)];

/** Logistics tab with no event picked: every trip in the branch. */
export default function AllTripsList() {
  const [filters, setFilters] = useState({ search: "", when: "upcoming", status: "all" });
  const list = useFilteredList({
    entity: "CateringTrip",
    cacheKey: "catering-trips",
    searchFields: ["event_name", "driver_name", "vehicle_name"],
    ...filters,
    query: enumFilter("stage", filters.status, STAGES),
  });

  return (
    <AllEventsFrame
      title="All trips"
      list={list}
      empty="No trips match these filters."
      filters={<EventListFilters value={filters} onChange={setFilters} options={STAGES} placeholder="Search event, driver, vehicle…" />}
    >
      <Card className="divide-y">
        {list.rows.map((t) => <AllTripRow key={t.id} trip={t} />)}
      </Card>
    </AllEventsFrame>
  );
}