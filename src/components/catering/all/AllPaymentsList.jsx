import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import useAllEventsPages from "./useAllEventsPages";
import AllEventsFrame from "./AllEventsFrame";
import PaymentFilters from "./PaymentFilters";
import PaymentTotals from "./PaymentTotals";
import AllPaymentRow from "./AllPaymentRow";
import useEventWhenScope from "./useEventWhenScope";
import { dateRange } from "./allEventsQuery";

/** Deposits & Payments tab with no event picked: the branch's payments, upcoming events first. */
export default function AllPaymentsList() {
  const [filters, setFilters] = useState({ when: "upcoming", status: "all", type: "all", from: "", to: "" });
  const eventScope = useEventWhenScope(filters.when);
  // The totals follow the event dates, type and payment dates; they are already split by status.
  const scope = {
    ...eventScope.query,
    ...(filters.type !== "all" && { payment_type: filters.type }),
    ...dateRange("payment_date", filters.from, filters.to),
  };
  const list = useAllEventsPages({
    entity: "CateringPayment",
    cacheKey: "catering-payments",
    sort: "-payment_date",
    query: { ...scope, ...(filters.status !== "all" && { status: filters.status }) },
    enabled: eventScope.ready,
  });

  return (
    <AllEventsFrame
      title="All deposits & payments"
      list={list}
      empty="No payments match these filters."
      filters={<PaymentFilters value={filters} onChange={setFilters} />}
      summary={<PaymentTotals query={scope} enabled={eventScope.ready} />}
    >
      <Card className="divide-y">
        {list.rows.map((p) => <AllPaymentRow key={p.id} payment={p} />)}
      </Card>
    </AllEventsFrame>
  );
}