import React from "react";
import { Badge } from "@/components/ui/badge";
import { statusWords } from "@/components/catering/eventLabels";
import { billableGuests } from "@/components/catering/confirm/confirmOperations";
import AllEventRow from "./AllEventRow";

/** One event in the all-events Planning list, with the Planning tab's status badges. */
export default function AllPlanningRow({ event: e }) {
  const guests = `${billableGuests(e)} guests${e.guarantee_locked ? " (guaranteed)" : ""}`;
  return (
    <AllEventRow event={e} tab="planning" detail={`${guests} · ${statusWords(e.status)}`}>
      <Badge variant="outline" className="text-xs">Reservations: {statusWords(e.reservation_status)}</Badge>
      <Badge variant="outline" className="text-xs">Production: {statusWords(e.production_plan_status)}</Badge>
      <Badge variant="outline" className="text-xs">Procurement: {statusWords(e.procurement_status)}</Badge>
      {e.reservation_status === "shortfall" && (
        <Badge className="bg-red-100 text-red-700 text-xs">{e.reservation_shortfall_count || 0} stock shortfall(s)</Badge>
      )}
    </AllEventRow>
  );
}