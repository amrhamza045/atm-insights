import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import useAllEventsPages from "./useAllEventsPages";
import AllEventsFrame from "./AllEventsFrame";
import FilterSelect from "./FilterSelect";
import AllQuoteRow from "./AllQuoteRow";
import { textSearch, WHEN_OPTIONS } from "./allEventsQuery";
import useEventWhenScope from "./useEventWhenScope";

const STATUSES = [
  ["all", "All statuses"], ["active", "Active"], ["pending_approval", "Awaiting approval"],
  ["accepted", "Accepted"], ["superseded", "Superseded"], ["rejected", "Rejected"],
];

/** Quotes tab with no event picked: the branch's quotes, upcoming events first. */
export default function AllQuotesList() {
  const [when, setWhen] = useState("upcoming");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search.trim());
  const eventScope = useEventWhenScope(when);
  const list = useAllEventsPages({
    entity: "CateringQuote",
    cacheKey: "catering-quotes",
    sort: "-created_date",
    query: { ...eventScope.query, ...(status !== "all" && { status }), ...textSearch("event_name", term) },
    enabled: eventScope.ready,
  });
  // Same cache as the Quotes tab: a package renamed after quoting shows its current name.
  const { data: packages = [] } = useQuery({
    queryKey: ["catering-packages"],
    queryFn: () => base44.entities.CateringPackage.list("-created_date", 200),
  });
  const packageName = (q) => packages.find((p) => p.id === q.package_id)?.name || q.package_name;

  return (
    <AllEventsFrame
      title="All quotes"
      list={list}
      empty="No quotes match these filters."
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-9 w-56 bg-white" placeholder="Search by event…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <FilterSelect value={when} onChange={setWhen} options={WHEN_OPTIONS} />
          <FilterSelect value={status} onChange={setStatus} options={STATUSES} />
        </div>
      }
    >
      <Card className="divide-y">
        {list.rows.map((q) => <AllQuoteRow key={q.id} quote={q} packageName={packageName(q)} />)}
      </Card>
    </AllEventsFrame>
  );
}