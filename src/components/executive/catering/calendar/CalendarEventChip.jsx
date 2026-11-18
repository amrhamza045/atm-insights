import React from "react";
import { statusChipStyle, isCancelled, eventTypeColor } from "./calendarEventStyle";
import ConflictBadge, { CONFLICT_RING } from "./ConflictBadge";

// Compact chip used in the month grid; `detailed` adds time/guests for agenda views.
export default function CalendarEventChip({ event, quoteById, onSelect, detailed = false, conflict = null }) {
  const { bg, fg } = statusChipStyle(event);
  const cancelled = isCancelled(event);
  // A cancelled event isn't happening, so its conflicts are moot — no ring, no badge.
  const severity = cancelled ? null : conflict?.severity || null;

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      title={`${event.event_name || "Event"} — ${event.status || ""}${
        severity ? ` — ${conflict.count} conflict${conflict.count === 1 ? "" : "s"}` : ""
      }`}
      className="relative w-full text-left rounded-[3px] px-1.5 py-1 transition-opacity hover:opacity-80 overflow-hidden"
      style={{
        backgroundColor: bg,
        color: fg,
        borderLeft: `3px solid ${eventTypeColor(event, quoteById)}`,
        // Ring sits outside the box, so it competes with neither the fill nor the left border.
        boxShadow: severity ? `0 0 0 1px #fff, 0 0 0 3px ${CONFLICT_RING[severity]}` : undefined,
      }}
    >
      {severity && <ConflictBadge severity={severity} className="absolute top-0.5 right-0.5" />}
      <span
        className={`block truncate text-[11px] font-medium leading-tight ${cancelled ? "line-through" : ""} ${
          severity ? "pr-4" : ""
        }`}
      >
        {event.event_name || "Untitled event"}
      </span>
      {detailed && (
        <span className="block truncate text-[10px] opacity-80 leading-tight mt-0.5">
          {[event.start_time, event.venue_name, event.expected_guests ? `${event.expected_guests} guests` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      )}
    </button>
  );
}