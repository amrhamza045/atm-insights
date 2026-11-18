import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventHierarchyFilter from "./EventHierarchyFilter";
import { CalendarCheck, Wrench, AlertTriangle, CheckCircle2, Filter, Loader, X } from "lucide-react";
import DateWindowFilter from "./DateWindowFilter";

export const STATUS_OPTIONS = [
  { key: "all", label: "All", icon: Filter },
  { key: "available", label: "Available", icon: CheckCircle2 },
  { key: "reserved", label: "Reserved", icon: CalendarCheck },
  { key: "in_maintenance", label: "In Maintenance", icon: Loader },
  { key: "maintenance", label: "Maintained", icon: Wrench },
  { key: "damaged", label: "Damaged", icon: AlertTriangle },
];

export const EMPTY_FILTER = { status: "all", eventId: "all", from: "", to: "" };

/** Global status / event / availability-window filter shared by all Assets sub-views. */
export default function GlobalCostFilter({ filter, onChange, events = [] }) {
  const set = (patch) => onChange({ ...filter, ...patch });

  const eventName = (filter.eventId || "").startsWith("type:")
    ? `All ${filter.eventId.slice(5)}`
    : events.find((e) => e.id === filter.eventId)?.name;
  const chips = [
    filter.status !== "all" && { key: "status", label: STATUS_OPTIONS.find((o) => o.key === filter.status)?.label, clear: { status: "all" } },
    filter.eventId !== "all" && { key: "event", label: eventName || "Event", clear: { eventId: "all" } },
    filter.from && { key: "from", label: `From: ${filter.from}`, clear: { from: "" } },
    filter.to && { key: "to", label: `To: ${filter.to}`, clear: { to: "" } },
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <Badge key={c.key} className="bg-amber-100 text-amber-700 gap-1 font-normal">
            {c.label}
            <button onClick={() => set(c.clear)} aria-label={`Remove ${c.label}`} className="hover:text-amber-900">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {chips.length > 0 && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onChange(EMPTY_FILTER)}>
            <X className="w-3.5 h-3.5" /> Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((o) => (
              <Button
                key={o.key}
                size="sm"
                variant={filter.status === o.key ? "default" : "ghost"}
                className="gap-1 h-7 text-xs"
                onClick={() => set({ status: o.key })}
              >
                <o.icon className="w-3.5 h-3.5" /> {o.label}
              </Button>
            ))}
          </div>
          <EventHierarchyFilter value={filter.eventId || "all"} onChange={(v) => set({ eventId: v })} events={events} />
          <DateWindowFilter from={filter.from} to={filter.to} onChange={({ from, to }) => set({ from, to })} />
      </div>
    </div>
  );
}