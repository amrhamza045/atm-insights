import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { companyToday } from "@/components/utils/timezoneHelper";
import { whenQuery } from "./all/allEventsQuery";

const OPTIONS = [
  ["upcoming", "Upcoming"], ["past", "Past"], ["all", "All dates"],
  ["today", "Today"], ["week", "This week"], ["month", "This month"],
];

const SPANS = {
  today: (d) => [d, d],
  week: (d) => [startOfWeek(d, { weekStartsOn: 1 }), endOfWeek(d, { weekStartsOn: 1 })],
  month: (d) => [startOfMonth(d), endOfMonth(d)],
};

/** Server filter and order for the Events tab's date choice: upcoming soonest first, past and all dates newest first. */
export function eventDateWindow(range) {
  const span = SPANS[range];
  if (!span) return whenQuery("event_date", range);
  const [from, to] = span(new Date(`${companyToday()}T00:00:00`)).map((d) => format(d, "yyyy-MM-dd"));
  return { query: { event_date: { $gte: from, $lte: to } }, sort: "event_date" };
}

export default function EventDateRangeSelect({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full gap-2 rounded-lg border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 shadow-none transition-colors hover:bg-white focus:ring-2 focus:ring-slate-200">
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-left"><SelectValue /></span>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}