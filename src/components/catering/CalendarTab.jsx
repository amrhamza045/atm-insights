import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import { CateringFilterProvider } from "@/components/executive/catering/CateringFilterContext";
import VenueFilterBar from "@/components/executive/catering/VenueFilterBar";
import CateringEventCalendar from "@/components/executive/catering/calendar/CateringEventCalendar";
import FilterSelect from "./all/FilterSelect";
import { WHEN_OPTIONS, whenQuery } from "./all/allEventsQuery";
import useEventsInWindow from "./useEventsInWindow";

/** Read-only event calendar of the branch: upcoming events by default, past or all dates loaded on request. */
export default function CalendarTab({ onOpenEvent }) {
  const [when, setWhen] = useState("upcoming");
  const { data: events = [] } = useEventsInWindow(whenQuery("event_date", when));
  return (
    <CateringFilterProvider>
      {/* One filter line: the calendar's own view buttons do the day / week / month / year paging. */}
      <VenueFilterBar
        events={events}
        dateControl={
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
              Date:
            </span>
            <FilterSelect value={when} onChange={setWhen} options={WHEN_OPTIONS} />
          </>
        }
      />
      <CateringEventCalendar events={events} onOpenEvent={onOpenEvent} />
    </CateringFilterProvider>
  );
}