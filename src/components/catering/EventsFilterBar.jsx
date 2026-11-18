import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, MapPin } from "lucide-react";

const ALL = "__all__";

/** Category (event type) and on-site / off-site filters for the Events tab. */
export default function EventsFilterBar({ eventTypes, eventType, onEventTypeChange, locationType, onLocationTypeChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:flex-[2] [&>*]:flex-1">
      <Select value={eventType || ALL} onValueChange={(v) => onEventTypeChange(v === ALL ? null : v)}>
        <SelectTrigger className="h-9 w-full gap-2 rounded-lg border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 shadow-none transition-colors hover:bg-white focus:ring-2 focus:ring-slate-200">
          <Tag className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="flex-1 truncate text-left"><SelectValue placeholder="All categories" /></span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {eventTypes.map((type) => (
            <SelectItem key={type} value={type}>{type}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={locationType || ALL} onValueChange={(v) => onLocationTypeChange(v === ALL ? null : v)}>
        <SelectTrigger className="h-9 w-full gap-2 whitespace-nowrap rounded-lg border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 shadow-none transition-colors hover:bg-white focus:ring-2 focus:ring-slate-200">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="flex-1 truncate text-left"><SelectValue placeholder="All locations" /></span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          <SelectItem value="on_site">On-site</SelectItem>
          <SelectItem value="off_site">Off-site</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}