import React from "react";
import { Input } from "@/components/ui/input";
import FilterSelect from "./FilterSelect";
import { WHEN_OPTIONS } from "./allEventsQuery";

/** Search, upcoming / past (lists whose filters carry `when`) and the tab's own dropdown. */
export default function EventListFilters({ value, onChange, options, placeholder = "Search by event or client…" }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input className="h-9 w-56 bg-white" placeholder={placeholder} value={value.search} onChange={(e) => set("search")(e.target.value)} />
      {value.when && <FilterSelect value={value.when} onChange={set("when")} options={WHEN_OPTIONS} />}
      <FilterSelect value={value.status} onChange={set("status")} options={options} />
    </div>
  );
}