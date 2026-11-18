import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Truck } from "lucide-react";

function Line({ ok, title, detail, actionLabel, onAction }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`rounded-lg border p-3 flex items-start gap-2.5 ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${ok ? "text-emerald-600" : "text-amber-600"}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${ok ? "text-emerald-900" : "text-amber-900"}`}>{title}</p>
        {detail && <p className={`text-xs mt-0.5 ${ok ? "text-emerald-700" : "text-amber-800"}`}>{detail}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// One entry per equipment name with combined quantity.
function grouped(rows, withDetail) {
  const map = new Map();
  rows.forEach((r) => {
    const g = map.get(r.equipment_name) || { qty: 0, details: new Set() };
    g.qty += Number(r.quantity) || 0;
    if (r.conflict_detail) g.details.add(r.conflict_detail);
    map.set(r.equipment_name, g);
  });
  return [...map].map(([name, g]) =>
    `${g.qty} × ${name}${withDetail && g.details.size ? ` — ${[...g.details].join("; ")}` : ""}`
  );
}

/**
 * Status readout after (or for an already-confirmed) event. Each unresolved area
 * links to the tab that owns it — nothing is auto-created beyond equipment.
 */
export default function ConfirmationSummary({ event, result, onGoToTab }) {
  const staffingReady = (event?.staffing_requirements || []).length > 0;
  const reservations = result?.reservations || [];
  const reserved = reservations.filter((r) => r.status === "reserved");
  const requested = reservations.filter((r) => r.status === "requested");
  const transport = grouped((result?.transportNeeded || []).filter((r) => r.status !== "dispatched"));
  const reservedList = grouped(reserved);
  const requestedList = grouped(requested, true);
  const offSite = event?.location_type === "off_site";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Operations started</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Line ok title="Quote locked" detail="The approved quote is accepted and can no longer change." />
        <Line ok title="Event moved to In Progress" detail="Planning, staffing and equipment work can begin." />

        <Line
          ok={staffingReady}
          title={staffingReady ? "Staffing plan ready" : "Staffing: needs manual planning"}
          detail={
            staffingReady
              ? `${event.staffing_requirements.length} role(s) planned — assign people in the Staffing tab.`
              : "No staffing requirements on this event. Build the plan in the Staffing tab."
          }
          actionLabel="Staffing"
          onAction={() => onGoToTab("staffing")}
        />

        {result?.equipmentPlanned ? (
          <>
            {reserved.length > 0 && (
              <Line
                ok
                title={`Equipment reserved (${reservedList.length})`}
                detail={reservedList.join(", ")}
                actionLabel="Equipment"
                onAction={() => onGoToTab("equipment")}
              />
            )}
            {requested.length > 0 && (
              <Line
                title={`Equipment not covered (${requestedList.length})`}
                detail={requestedList.join(" · ")}
                actionLabel="Equipment"
                onAction={() => onGoToTab("equipment")}
              />
            )}
          </>
        ) : (
          <Line
            title="Equipment: needs manual planning"
            detail={
              result?.reason === "no_package"
                ? "This quote was not built from a package, so there are no equipment requirements to apply."
                : "The source package has no equipment requirements defined."
            }
            actionLabel="Equipment"
            onAction={() => onGoToTab("equipment")}
          />
        )}

        {offSite && (
          <Line
            title="Logistics planning needed"
            detail={`Off-site event${event.venue_name ? ` at ${event.venue_name}` : ""} — create the trips in the Logistics tab.`}
            actionLabel="Logistics"
            onAction={() => onGoToTab("logistics")}
          />
        )}

        {offSite && transport.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2.5">
            <Truck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-900">Special transport required</p>
              <p className="text-xs text-blue-800 mt-0.5">{transport.join(", ")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}