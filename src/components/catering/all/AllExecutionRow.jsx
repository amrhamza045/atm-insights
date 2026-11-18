import React from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EVENT_STATUS_STYLES, statusWords } from "@/components/catering/eventLabels";
import { eventRiskCountFromRecord } from "@/components/catering/executionLogic";
import AllEventRow from "./AllEventRow";

/** One event in the all-events Execution list: time, venue, crew and open issues. */
export default function AllExecutionRow({ event: e }) {
  const venue = e.location_type === "off_site" ? e.venue_name || "Off-site" : "On-site";
  const time = e.start_time ? `${e.start_time}–${e.end_time || ""}` : "";
  const risks = ["cancelled", "completed"].includes(e.status) ? 0 : eventRiskCountFromRecord(e);
  return (
    <AllEventRow event={e} tab="execution" detail={[time, venue, `${e.expected_guests || 0} expected`].filter(Boolean).join(" · ")}>
      <Badge className={EVENT_STATUS_STYLES[e.status] || "bg-slate-100 text-slate-700"}>{statusWords(e.status)}</Badge>
      <Badge variant="outline" className="text-xs">Crew {e.staffing_assigned_count || 0}/{e.staffing_required_count || 0}</Badge>
      {risks > 0 && (
        <Badge className="bg-red-100 text-red-700 text-xs gap-1">
          <AlertTriangle className="w-3 h-3" /> At risk: {risks} open issue(s)
        </Badge>
      )}
    </AllEventRow>
  );
}