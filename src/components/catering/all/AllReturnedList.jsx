import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import useAllEventsPages from "./useAllEventsPages";
import AllEventsFrame from "./AllEventsFrame";
import AllReturnedRow from "./AllReturnedRow";
import FilterSelect from "./FilterSelect";
import { WHEN_OPTIONS, whenQuery } from "./allEventsQuery";

const COLUMNS = [["Event"], ["Item"], ["Category"], ["Quantity", true], ["Value", true], ["Condition"], ["Disposition"], [""]];

/** Returned tab with no event picked: the branch's returned items, upcoming events first. */
export default function AllReturnedList() {
  const { selectedBranchId } = useBranch();
  const [when, setWhen] = useState("upcoming");
  const range = whenQuery("event_date", when).query;
  const list = useAllEventsPages({ entity: "CateringReturnedItem", cacheKey: "catering-returned", sort: "-created_date", query: range });
  // The total follows the chosen event dates.
  const { data: totalValue = 0 } = useQuery({
    queryKey: ["catering-returned", "all-events-value", selectedBranchId, range],
    queryFn: async () => {
      const { rows } = await base44.entities.CateringReturnedItem.aggregate({ query: { branch_id: selectedBranchId, ...range }, sum: ["total_value"] });
      return rows[0]?.sum_total_value || 0;
    },
    enabled: !!selectedBranchId,
  });

  return (
    <AllEventsFrame
      title="All returned items"
      list={list}
      empty={when === "all" ? "Nothing has been logged as returned yet." : `No returned items for ${when} events.`}
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={when} onChange={setWhen} options={WHEN_OPTIONS} />
          <Badge className="bg-slate-100 text-slate-700">Total value {formatCurrency(totalValue)}</Badge>
        </div>
      }
    >
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map(([label, right], i) => <TableHead key={i} className={right ? "text-right" : ""}>{label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((r) => <AllReturnedRow key={r.id} row={r} />)}
          </TableBody>
        </Table>
      </Card>
    </AllEventsFrame>
  );
}