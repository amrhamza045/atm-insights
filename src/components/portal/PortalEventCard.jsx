import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const STATUS_STYLES = {
  completed: "bg-emerald-100 text-emerald-700",
  confirmed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function PortalEventCard({ event, active, onSelect }) {
  const location = event.location_type === "off_site" ? event.venue_name || "Off-site venue" : event.branch_name || "At the restaurant";
  return (
    <Card
      onClick={() => onSelect(event)}
      className={`p-4 cursor-pointer transition-colors ${active ? "border-slate-900 ring-1 ring-slate-900" : "hover:bg-slate-50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-900 min-w-0 truncate">{event.event_name}</p>
        <Badge className={STATUS_STYLES[event.status] || "bg-slate-100 text-slate-700"}>
          {(event.status || "").replace(/_/g, " ")}
        </Badge>
      </div>
      <div className="mt-2 space-y-1 text-xs text-slate-600">
        <p className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {event.event_date}{event.start_time ? ` · ${event.start_time}` : ""}</p>
        <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {location}</p>
        <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {event.expected_guests || 0} guest(s)</p>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{formatCurrency(event.quote_total || 0, true)}</p>
    </Card>
  );
}