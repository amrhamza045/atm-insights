import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronDown, ChevronRight } from "lucide-react";

/** "Wedding — Hany Elhamy" → { type: "Wedding", rest: "Hany Elhamy" } */
export const eventType = (name = "") => (name.split("—")[0] || "Other").trim() || "Other";

export const groupEvents = (events) => {
  const groups = {};
  events.forEach((e) => {
    const type = eventType(e.name);
    (groups[type] = groups[type] || []).push(e);
  });
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
};

/** Two-level event picker: event type group → "All <type>" or one specific event. */
export default function EventHierarchyFilter({ value = "all", onChange, events = [] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const groups = groupEvents(events);

  let label = "All events";
  if (value.startsWith("type:")) label = `All ${value.slice(5)}`;
  else if (value !== "all") label = events.find((e) => e.id === value)?.name || "Event";

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  const Row = ({ active, children, onClick, className = "" }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-100 ${className}`}
    >
      <span className="truncate text-left">{children}</span>
      {active && <Check className="w-4 h-4 flex-shrink-0 text-amber-600" />}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-56 justify-between font-normal">
          <span className="truncate">{label}</span>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="start">
        <ScrollArea className="max-h-80">
          <Row active={value === "all"} onClick={() => pick("all")}>All events</Row>
          {groups.map(([type, list]) => (
            <div key={type}>
              <div className="flex items-center">
                <button
                  onClick={() => setExpanded((p) => ({ ...p, [type]: !p[type] }))}
                  className="p-1.5 text-slate-500 hover:text-slate-900"
                  aria-label={`Expand ${type}`}
                >
                  {expanded[type] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <Row active={value === `type:${type}`} onClick={() => pick(`type:${type}`)} className="font-medium">
                  All {type} ({list.length})
                </Row>
              </div>
              {expanded[type] && (
                <div className="pl-7">
                  {list.map((e) => (
                    <Row key={e.id} active={value === e.id} onClick={() => pick(e.id)}>
                      {e.name}
                    </Row>
                  ))}
                </div>
              )}
            </div>
          ))}
          {groups.length === 0 && <div className="px-2 py-3 text-sm text-slate-500">No events yet</div>}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}