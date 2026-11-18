import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import useAllEventsPages from "./useAllEventsPages";
import AllEventsFrame from "./AllEventsFrame";
import FilterSelect from "./FilterSelect";
import AllReconciliationRow from "./AllReconciliationRow";
import UnreconciledEvents from "./UnreconciledEvents";
import { WHEN_OPTIONS, whenQuery } from "./allEventsQuery";

const STATUSES = [["all", "All statuses"], ["open", "Open"], ["finalized", "Finalized"]];

/** Reconciliation tab with no event picked: the branch's reconciliations, upcoming events first. */
export default function AllReconciliationsList() {
  const [when, setWhen] = useState("upcoming");
  const [status, setStatus] = useState("all");
  const range = whenQuery("event_date", when);
  const list = useAllEventsPages({
    entity: "CateringReconciliation",
    cacheKey: "catering-reconciliation",
    sort: range.sort,
    query: { ...range.query, ...(status !== "all" && { status }) },
  });

  return (
    <div className="space-y-4">
      <UnreconciledEvents when={when} />
      <AllEventsFrame
        title="All reconciliations"
        list={list}
        empty="No reconciliations match these filters."
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={when} onChange={setWhen} options={WHEN_OPTIONS} />
            <FilterSelect value={status} onChange={setStatus} options={STATUSES} />
          </div>
        }
      >
        <Card className="divide-y">
          {list.rows.map((r) => <AllReconciliationRow key={r.id} rec={r} />)}
        </Card>
      </AllEventsFrame>
    </div>
  );
}