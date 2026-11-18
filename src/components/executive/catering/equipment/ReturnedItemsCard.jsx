import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReturnedFilters from "@/components/executive/catering/returned/ReturnedFilters";
import ReturnedItemsTable from "@/components/executive/catering/returned/ReturnedItemsTable";
import { RETURNS_INFO } from "./equipmentConfig";

const NONE = { category: "all", disposition: "all", condition: "all", event: "all", search: "" };
const matches = (r, f, q) =>
  (f.category === "all" || r.category === f.category) && (f.disposition === "all" || r.disposition === f.disposition)
  && (f.condition === "all" || r.condition === f.condition) && (f.event === "all" || r.event_name === f.event)
  && (!q || `${r.item_name} ${r.event_name}`.toLowerCase().includes(q));

// Every item logged back after the period's events, with filters.
export default function ReturnedItemsCard({ rows, currency }) {
  const [filter, setFilter] = useState(NONE);
  const [sort, setSort] = useState({ key: "event_date", dir: "desc" });
  const [all, setAll] = useState(false);
  const q = filter.search.trim().toLowerCase();
  const shown = rows.filter((r) => matches(r, filter, q)).sort((a, b) => {
    const av = a[sort.key] ?? "", bv = b[sort.key] ?? "";
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sort.dir === "asc" ? cmp : -cmp;
  });
  return (
    <ReportCard title="Returned items" info={RETURNS_INFO}>
      <div className="mb-4"><ReturnedFilters filter={filter} onChange={setFilter} events={[...new Set(rows.map((r) => r.event_name))].sort()} /></div>
      <ReturnedItemsTable rows={all ? shown : shown.slice(0, 25)} sort={sort} onSortChange={setSort} currency={currency} />
      {shown.length > 25 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-gold hover:underline">{all ? "Show fewer" : `Show all ${shown.length}`}</button>}
    </ReportCard>
  );
}