import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Filter } from "lucide-react";

/** Event id passed in the URL (?event_id=) by the Event Overview links. */
export function useUrlEventId() {
  const location = useLocation();
  return new URLSearchParams(location.search).get("event_id");
}

export default function EventScopeChip({ eventId }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: event } = useQuery({
    queryKey: ["scope-chip-event", eventId],
    queryFn: () => base44.entities.CateringEvent.get(eventId),
    enabled: !!eventId,
  });
  if (!eventId) return null;
  const clear = () => {
    const p = new URLSearchParams(location.search);
    p.delete("event_id");
    navigate(`${location.pathname}${p.toString() ? `?${p}` : ""}`, { replace: true });
  };
  return (
    <div className="inline-flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-3 py-1">
      <Filter className="w-3.5 h-3.5" />
      <span className="truncate">Filtered to event: {event?.event_name || "…"}</span>
      <button type="button" onClick={clear} aria-label="Clear event filter" className="hover:text-amber-950"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}