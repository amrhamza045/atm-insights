import React from "react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const Stat = ({ label, value }) => (
  <div className="rounded-md bg-muted px-2 py-1.5">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

/** The values an extra-items / additional-requisition allowance check used (from a requisition or a revision). */
export default function ApprovalBasis({ values: v }) {
  const hasAllowance = v?.allowance_configured_at_check !== undefined || v?.allowance_remaining_before !== undefined || v?.is_additional === true;
  if (!hasAllowance && v?.limit_percent_applied == null) return null;

  if (hasAllowance) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat
          label="Configured event allowance"
          value={v.allowance_configured_at_check == null ? "0.00 EGP" : formatCurrency(v.allowance_configured_at_check)}
        />
        <Stat
          label="Remaining before request"
          value={formatCurrency(v.allowance_remaining_before ?? 0)}
        />
        <Stat label="Requested cost" value={formatCurrency(v.extras_total_applied ?? v.extras_estimated_cost ?? 0)} />
        <Stat label="Uncosted items" value={v.uncosted_extras_count ?? v.uncosted_line_count ?? 0} />
      </div>
    );
  }

  const source = v.planned_food_cost_source === "quote_food_cost" ? "quote food cost" : "requisition planned estimate";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Stat label={`Planned food cost (${source})`} value={formatCurrency(v.planned_food_cost_applied)} />
      <Stat label={`Limit (${v.limit_percent_applied}%)`} value={formatCurrency(v.limit_amount_applied)} />
      <Stat label="Extras total" value={formatCurrency(v.extras_total_applied)} />
      <Stat label="Uncosted extras" value={v.uncosted_extras_count || 0} />
    </div>
  );
}