import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { STAGE_LABELS, transportCost } from "@/components/catering/logisticsLogic";
import OpenEventButton from "./OpenEventButton";

const TONE = {
  planned: "bg-slate-100 text-slate-700",
  returned: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-500",
};

/** One trip in the all-events Logistics list. */
export default function AllTripRow({ trip: t }) {
  const discrepancies = Number(t.discrepancy_count) || 0;
  const vehicle = t.vehicle_name ? `${t.vehicle_name}${t.vehicle_plate ? ` (${t.vehicle_plate})` : ""}` : "No vehicle";
  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">{t.event_name}</p>
        <p className="text-xs text-slate-500">{[t.event_date, t.trip_label, t.destination_label].filter(Boolean).join(" · ")}</p>
        <p className="text-xs text-slate-500">{vehicle} · {t.driver_name || "No driver"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={TONE[t.stage] || "bg-blue-100 text-blue-700"}>{STAGE_LABELS[t.stage] || t.stage}</Badge>
        {discrepancies > 0 && (
          <Badge className="bg-red-100 text-red-700 text-xs">{discrepancies} return discrepanc{discrepancies === 1 ? "y" : "ies"}</Badge>
        )}
        <span className="font-semibold text-slate-900">{formatCurrency(transportCost(t))}</span>
        <OpenEventButton tab="logistics" eventId={t.event_id} />
      </div>
    </div>
  );
}