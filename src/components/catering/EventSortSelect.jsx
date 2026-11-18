import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

export default function EventSortSelect({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full gap-2 rounded-lg border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 shadow-none transition-colors hover:bg-white focus:ring-2 focus:ring-slate-200">
        <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-left"><SelectValue placeholder="Sort by" /></span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="date_asc">Date (soonest first)</SelectItem>
        <SelectItem value="date_desc">Date (latest first)</SelectItem>
        <SelectItem value="name">Name (A–Z)</SelectItem>
      </SelectContent>
    </Select>
  );
}