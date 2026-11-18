import React, { useState } from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday } from "date-fns";
import CalendarEventChip from "./CalendarEventChip";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

function DayCell({ day, focusDate, events, quoteById, onSelect, conflictsByEventId = {} }) {
  const [expanded, setExpanded] = useState(false);
  const outside = !isSameMonth(day, focusDate);
  const shown = expanded ? events : events.slice(0, MAX_CHIPS);
  const hidden = events.length - shown.length;

  return (
    <div
      className={`min-h-[92px] border-b border-r border-slate-100 p-1.5 flex flex-col gap-1 ${
        outside ? "bg-slate-50/60" : "bg-white"
      }`}
    >
      <span
        className={`text-[11px] font-semibold ${
          isToday(day)
            ? "text-white bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center"
            : outside
            ? "text-slate-300"
            : "text-slate-500"
        }`}
      >
        {format(day, "d")}
      </span>
      <div className="flex flex-col gap-1">
        {shown.map((e) => (
          <CalendarEventChip
            key={e.id}
            event={e}
            quoteById={quoteById}
            onSelect={onSelect}
            conflict={conflictsByEventId[e.id]}
          />
        ))}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-[10px] text-slate-500 hover:text-slate-800 text-left font-medium"
          >
            +{hidden} more
          </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarMonthGrid({ focusDate, eventsByDate, quoteById, onSelect, conflictsByEventId }) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(focusDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(focusDate), { weekStartsOn: 1 }),
  });

  return (
    <div className="border-t border-l border-slate-100 rounded-md overflow-hidden">
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-b border-r border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500"
          >
            {d}
          </div>
        ))}
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            focusDate={focusDate}
            events={eventsByDate[format(day, "yyyy-MM-dd")] || []}
            quoteById={quoteById}
            onSelect={onSelect}
            conflictsByEventId={conflictsByEventId}
          />
        ))}
      </div>
    </div>
  );
}