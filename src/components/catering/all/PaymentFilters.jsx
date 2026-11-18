import React from "react";
import { Input } from "@/components/ui/input";
import FilterSelect from "./FilterSelect";
import { WHEN_OPTIONS } from "./allEventsQuery";

const STATUSES = [
  ["all", "All statuses"], ["pending", "Awaiting approval"], ["completed", "Completed"],
  ["voided", "Voided"], ["rejected", "Rejected"], ["refunded", "Refunded"],
];
const TYPES = [
  ["all", "All types"], ["deposit", "Deposit"], ["final_balance", "Final balance"], ["additional", "Additional"],
  ["penalty", "Penalty"], ["refund", "Refund"], ["deposit_withdrawal", "Deposit withdrawal"],
];

/** Event dates, status, type and payment-date filters of the all-events payments list. */
export default function PaymentFilters({ value, onChange }) {
  const set = (key) => (v) => onChange({ ...value, [key]: v });
  return (
    <div className="flex flex-wrap items-end gap-2">
      <FilterSelect value={value.when} onChange={set("when")} options={WHEN_OPTIONS} />
      <FilterSelect value={value.status} onChange={set("status")} options={STATUSES} />
      <FilterSelect value={value.type} onChange={set("type")} options={TYPES} />
      <label className="text-xs text-slate-600">
        From
        <Input type="date" className="h-9 mt-1 bg-white" value={value.from} onChange={(e) => set("from")(e.target.value)} />
      </label>
      <label className="text-xs text-slate-600">
        To
        <Input type="date" className="h-9 mt-1 bg-white" value={value.to} onChange={(e) => set("to")(e.target.value)} />
      </label>
    </div>
  );
}