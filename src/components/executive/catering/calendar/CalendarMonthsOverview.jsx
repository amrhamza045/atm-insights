import React from "react";
import { eachMonthOfInterval, eachDayOfInterval, startOfMonth, endOfMonth, format } from "date-fns";
import CalendarEventChip from "./CalendarEventChip";

// Compact overview used by the quarter and year views: one column per month, listing
// only the days that actually have events. A full 7-column grid per month would be
// unreadable at 12 months wide, so this stays a dense agenda per month instead.
function MonthColumn({ month, eventsByDate, quoteById, onSelect, conflictsByEventId }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
    .map((d) => ({ date: d, key: format(d, "yyyy-MM-dd") }))
    .map((d) => ({ ...d, events: eventsByDate[d.key] || [] }))
    .filter((d) => d.events.length > 0);

  const total = days.reduce((sum, d) => sum + d.events.length, 0);

  return (
    // Every month card is the same height whatever its event count, so the grid stays
    // even; busy months scroll internally instead of stretching their row.
    <div className="flex flex-col h-64 rounded-md border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 border-b border-slate-200 shrink-0">
        <span className="text-[11px] font-semibold text-slate-700">{format(month, "MMMM yyyy")}</span>
        <span className="text-[10px] text-slate-400">{total}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
        {days.length === 0 ? (
          <p className="text-[10px] text-slate-400 px-0.5 py-1">No events</p>
        ) : (
          days.map((d) => (
            <div key={d.key} className="flex gap-1.5">
              <span className="w-8 shrink-0 text-[10px] text-slate-400 pt-1">{format(d.date, "d MMM")}</span>
              <div className="flex-1 space-y-1 min-w-0">
                {d.events.map((e) => (
                  <CalendarEventChip
                    key={e.id}
                    event={e}
                    quoteById={quoteById}
                    onSelect={onSelect}
                    conflict={conflictsByEventId?.[e.id]}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CalendarMonthsOverview({
  rangeStart,
  rangeEnd,
  eventsByDate,
  quoteById,
  onSelect,
  conflictsByEventId,
}) {
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });

  return (
    <div className={`grid gap-2 ${months.length > 3 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
      {months.map((m) => (
        <MonthColumn
          key={m.toISOString()}
          month={m}
          eventsByDate={eventsByDate}
          quoteById={quoteById}
          onSelect={onSelect}
          conflictsByEventId={conflictsByEventId}
        />
      ))}
    </div>
  );
}