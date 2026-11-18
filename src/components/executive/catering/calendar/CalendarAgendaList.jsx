import React from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday } from "date-fns";
import CalendarEventChip from "./CalendarEventChip";

// Week and day views share one agenda layout — a labelled row per day.
export default function CalendarAgendaList({ focusDate, viewMode, eventsByDate, quoteById, onSelect, conflictsByEventId = {} }) {
  const days =
    viewMode === "day"
      ? [focusDate]
      : eachDayOfInterval({
          start: startOfWeek(focusDate, { weekStartsOn: 1 }),
          end: endOfWeek(focusDate, { weekStartsOn: 1 }),
        });

  return (
    <div className="divide-y divide-slate-100 border border-slate-100 rounded-md overflow-hidden">
      {days.map((day) => {
        const events = eventsByDate[format(day, "yyyy-MM-dd")] || [];
        return (
          <div key={day.toISOString()} className="flex gap-3 p-3 bg-white">
            <div className="w-24 shrink-0">
              <p className={`text-xs font-semibold ${isToday(day) ? "text-slate-900" : "text-slate-600"}`}>
                {format(day, "EEE d MMM")}
              </p>
              <p className="text-[10px] text-slate-400">
                {events.length} event{events.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              {events.length === 0 ? (
                <p className="text-[11px] text-slate-300">—</p>
              ) : (
                events.map((e) => (
                  <CalendarEventChip
                    key={e.id}
                    event={e}
                    quoteById={quoteById}
                    onSelect={onSelect}
                    conflict={conflictsByEventId[e.id]}
                    detailed
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}