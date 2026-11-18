import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { statusWords } from "@/components/catering/eventLabels";
import AllEventRow from "./AllEventRow";

const TONE = {
  planned: "bg-blue-100 text-blue-700",
  partially_staffed: "bg-amber-100 text-amber-800",
  fully_staffed: "bg-emerald-100 text-emerald-700",
};

/** One event in the all-events Staffing list: coverage, critical gaps and the labor estimate. */
export default function AllStaffingRow({ event: e }) {
  const unfilled = Number(e.staffing_unfilled_critical_count) || 0;
  const hasPlan = e.staffing_status && e.staffing_status !== "none";
  return (
    <AllEventRow event={e} tab="staffing" detail={`${e.expected_guests || 0} guests · ${statusWords(e.status)}`}>
      <Badge className={TONE[e.staffing_status] || "bg-slate-100 text-slate-600"}>
        {hasPlan ? statusWords(e.staffing_status) : "no plan yet"}
      </Badge>
      <Badge variant="outline" className="text-xs">Crew {e.staffing_assigned_count || 0}/{e.staffing_required_count || 0}</Badge>
      {unfilled > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{unfilled} critical unfilled</Badge>}
      <span className="text-xs font-medium text-amber-700">Labor {formatCurrency(e.estimated_labor_cost || 0)}</span>
    </AllEventRow>
  );
}