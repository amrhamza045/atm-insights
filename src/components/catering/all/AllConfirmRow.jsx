import React from "react";
import { Badge } from "@/components/ui/badge";
import { statusWords } from "@/components/catering/eventLabels";
import { billableGuests } from "@/components/catering/confirm/confirmOperations";
import AllEventRow from "./AllEventRow";

const STAGE = {
  confirmed: ["Ready to start", "bg-emerald-100 text-emerald-700"],
  in_progress: ["Operations started", "bg-indigo-100 text-indigo-700"],
  completed: ["Completed", "bg-slate-200 text-slate-700"],
  cancelled: ["Cancelled", "bg-red-100 text-red-700"],
};

/** One event in the all-events Confirm & Start list. */
export default function AllConfirmRow({ event: e }) {
  const [label, tone] = STAGE[e.status] || ["Not confirmed yet", "bg-amber-100 text-amber-800"];
  const detail = STAGE[e.status] ? `${billableGuests(e)} billable guests` : statusWords(e.status);
  return (
    <AllEventRow event={e} tab="pos" detail={detail} buttonLabel={e.status === "confirmed" ? "Open & start" : undefined}>
      <Badge className={tone}>{label}</Badge>
    </AllEventRow>
  );
}