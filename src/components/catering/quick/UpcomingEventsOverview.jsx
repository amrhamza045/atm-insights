import React, { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBranch } from "@/components/branches/BranchContext";
import { companyToday } from "@/components/utils/timezoneHelper";
import useAllEventsPages from "@/components/catering/all/useAllEventsPages";
import LoadMoreButton from "@/components/catering/all/LoadMoreButton";
import FilterSelect from "@/components/catering/all/FilterSelect";
import { WHEN_OPTIONS, whenQuery } from "@/components/catering/all/allEventsQuery";
import UpcomingEventRow from "./UpcomingEventRow";
import { STAGES } from "./upcomingStages";

const TITLES = { upcoming: "Upcoming events", past: "Past events", all: "All events" };

/** Quick Actions: where the branch's open events stand — upcoming by default (soonest first), past or all on request. */
export default function UpcomingEventsOverview({ hasTab }) {
  const { selectedBranch } = useBranch();
  const today = companyToday();
  const [when, setWhen] = useState("upcoming");
  const range = whenQuery("event_date", when);
  const list = useAllEventsPages({
    entity: "CateringEvent",
    cacheKey: "catering-events",
    sort: range.sort,
    query: { ...range.query, status: { $nin: ["cancelled", "completed"] } },
  });

  return (
    <section aria-label={TITLES[when]} className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 px-4 py-3">
        <CalendarClock className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">{TITLES[when]}</h2>
          <p className="text-xs text-slate-500">
            {list.total ? `${list.total} open` : "Open events"} in {selectedBranch?.name || "this branch"} (completed and cancelled left out) · select a stage to open it
          </p>
        </div>
        <FilterSelect value={when} onChange={setWhen} options={WHEN_OPTIONS} />
      </div>
      {list.isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : list.rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">{when === "all" ? "No open events." : `No ${when} events.`}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              {STAGES.map((s) => <TableHead key={s.key}>{s.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((e) => <UpcomingEventRow key={e.id} event={e} today={today} hasTab={hasTab} />)}
          </TableBody>
        </Table>
      )}
      {list.hasMore && <div className="border-t border-slate-200 p-3"><LoadMoreButton list={list} /></div>}
    </section>
  );
}