import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  addMonths, addWeeks, addDays, addQuarters, addYears, format,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
} from "date-fns";
import { useCateringFilter } from "../CateringFilterContext";
import { groupEventsByDate } from "./calendarEventStyle";
import { resolveCalendarView, VIEW_MODES } from "./calendarViewSync";
import CalendarMonthGrid from "./CalendarMonthGrid";
import CalendarAgendaList from "./CalendarAgendaList";
import CalendarMonthsOverview from "./CalendarMonthsOverview";
import CateringEventDetailDrawer from "./CateringEventDetailDrawer";
import CalendarLegend from "./CalendarLegend";
import useCateringConflicts from "./useCateringConflicts";

// Read-only calendar of catering events. Receives the FULL CateringEvent records so
// later conflict detection can join assignments/reservations by event_id additively.
export default function CateringEventCalendar({ events = [], onOpenEvent }) {
  const { filterEvents, quoteById, dateActive, dateRange, dateFilter } = useCateringFilter();
  const [userViewMode, setUserViewMode] = useState("month");
  const [focusDate, setFocusDate] = useState(new Date());
  const [selectedState, setSelectedState] = useState(null);
  const selected = selectedState;
  const setSelected = (ev) => (ev && onOpenEvent ? onOpenEvent(ev.id) : setSelectedState(ev));

  const resolved = resolveCalendarView({
    dateActive,
    dateRange,
    granularity: dateFilter?.granularity,
    userViewMode,
  });
  const viewMode = resolved.viewMode;
  const syncKey = dateActive ? `${dateRange.from}|${dateRange.to}` : "none";

  // The filter bar owns the window: whenever its resolved range changes, the
  // calendar jumps to it. Paging afterwards stays local until the filter moves again.
  useEffect(() => {
    setFocusDate(resolved.focusDate);
  }, [syncKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // The filter bar is the single source of truth for WHICH events appear.
  const visible = useMemo(() => filterEvents(events), [filterEvents, events]);
  const eventsByDate = useMemo(() => groupEventsByDate(visible), [visible]);

  // The dates currently on screen — the conflict window.
  const [windowStart, windowEnd] =
    viewMode === "year"
      ? [startOfYear(focusDate), endOfYear(focusDate)]
      : viewMode === "quarter"
      ? [startOfQuarter(focusDate), endOfQuarter(focusDate)]
      : viewMode === "month"
      ? [startOfWeek(startOfMonth(focusDate), { weekStartsOn: 1 }), endOfWeek(endOfMonth(focusDate), { weekStartsOn: 1 })]
      : viewMode === "week"
      ? [startOfWeek(focusDate, { weekStartsOn: 1 }), endOfWeek(focusDate, { weekStartsOn: 1 })]
      : [focusDate, focusDate];

  // Detection deliberately runs on the UNFILTERED set for those dates, so a clash with
  // an event hidden by the venue/type filter is still caught and still deep-linkable.
  const { conflictsByEventId } = useCateringConflicts({ events, windowStart, windowEnd });

  const jumpToEvent = (id) => {
    const target = events.find((e) => e.id === id);
    if (target) setSelected(target);
  };

  const step = (dir) => {
    if (viewMode === "year") setFocusDate((d) => addYears(d, dir));
    else if (viewMode === "quarter") setFocusDate((d) => addQuarters(d, dir));
    else if (viewMode === "month") setFocusDate((d) => addMonths(d, dir));
    else if (viewMode === "week") setFocusDate((d) => addWeeks(d, dir));
    else setFocusDate((d) => addDays(d, dir));
  };

  const heading =
    viewMode === "year"
      ? format(focusDate, "yyyy")
      : viewMode === "quarter"
      ? `${format(focusDate, "QQQ yyyy")} · ${format(startOfQuarter(focusDate), "MMM")} – ${format(endOfQuarter(focusDate), "MMM")}`
      : viewMode === "month"
      ? format(focusDate, "MMMM yyyy")
      : viewMode === "day"
      ? format(focusDate, "EEEE d MMMM yyyy")
      : `${format(startOfWeek(focusDate, { weekStartsOn: 1 }), "d MMM")} – ${format(
          endOfWeek(focusDate, { weekStartsOn: 1 }),
          "d MMM yyyy"
        )}`;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          <p className="text-sm font-semibold text-slate-900">Event calendar</p>
          <span className="text-xs text-slate-400">{visible.length} events</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => step(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium text-slate-700 min-w-[9rem] text-center">{heading}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => step(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center rounded-md bg-slate-100 p-0.5">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setUserViewMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${
                  viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {viewMode === "year" || viewMode === "quarter" ? (
        <CalendarMonthsOverview
          rangeStart={windowStart}
          rangeEnd={windowEnd}
          eventsByDate={eventsByDate}
          quoteById={quoteById}
          onSelect={setSelected}
          conflictsByEventId={conflictsByEventId}
        />
      ) : viewMode === "month" ? (
        <CalendarMonthGrid
          focusDate={focusDate}
          eventsByDate={eventsByDate}
          quoteById={quoteById}
          onSelect={setSelected}
          conflictsByEventId={conflictsByEventId}
        />
      ) : (
        <CalendarAgendaList
          focusDate={focusDate}
          viewMode={viewMode}
          eventsByDate={eventsByDate}
          quoteById={quoteById}
          onSelect={setSelected}
          conflictsByEventId={conflictsByEventId}
        />
      )}

      <CalendarLegend />

      <CateringEventDetailDrawer
        event={selected}
        quoteById={quoteById}
        conflict={selected ? conflictsByEventId[selected.id] : null}
        onJumpToEvent={jumpToEvent}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </Card>
  );
}