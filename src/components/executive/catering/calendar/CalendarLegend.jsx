import React from "react";

// `hint` is the hover explanation — the fill colours alone don't tell an executive which
// statuses they cover, so each swatch carries its own plain-language tooltip.
const ITEMS = [
  {
    label: "Confirmed / in progress",
    bg: "hsl(var(--primary))",
    hint: "Event is locked in — confirmed, being prepared, or running now. Staff, equipment and materials are committed.",
  },
  {
    label: "Completed",
    bg: "hsl(var(--secondary))",
    hint: "Event has already been delivered and closed. Shown for history and reporting only.",
  },
  {
    label: "Enquiry / quoted / deposit pending",
    bg: "hsl(var(--accent))",
    hint: "Still being sold — an enquiry, a sent quote, or waiting on the deposit. Nothing is committed yet, so it can still fall through.",
  },
  {
    label: "Cancelled",
    bg: "hsl(215 20% 92%)",
    hint: "Event was cancelled. Shown struck through, and its conflicts are ignored because it is no longer happening.",
  },
];

const CONFLICTS = [
  {
    label: "Blocking conflict (venue / staff)",
    ring: "#dc2626",
    hint: "A hard clash on the same date: the same venue is double-booked, or a staff member is assigned to two events at overlapping times. Needs resolving before the event can run.",
  },
  {
    label: "Review conflict (equipment)",
    ring: "#d97706",
    hint: "A soft clash worth checking: equipment reserved across events on this date exceeds the units available. May still be workable with staggered timings.",
  },
];

export default function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
      {ITEMS.map((i) => (
        <div key={i.label} title={i.hint} className="flex items-center gap-1.5 cursor-help">
          <span className="w-3 h-3 rounded-[3px] border border-slate-200" style={{ backgroundColor: i.bg }} />
          <span className="text-[10px] text-slate-500">{i.label}</span>
        </div>
      ))}
      <span
        title="The thin coloured stripe down the left edge of each chip is the event type (wedding, corporate, birthday…). Each type gets its own consistent colour."
        className="text-[10px] text-slate-400 cursor-help"
      >
        Left border = event type
      </span>
      {CONFLICTS.map((c) => (
        <div key={c.label} title={c.hint} className="flex items-center gap-1.5 cursor-help">
          <span className="w-3 h-3 rounded-[3px] bg-white" style={{ boxShadow: `0 0 0 2px ${c.ring}` }} />
          <span className="text-[10px] text-slate-500">{c.label}</span>
        </div>
      ))}
    </div>
  );
}