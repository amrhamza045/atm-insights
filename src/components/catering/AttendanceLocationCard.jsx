import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { deriveMode, MODE_LABELS, locationOf } from "./attendanceLocation";

export default function AttendanceLocationCard({ event, assignments, defaultLocation, onChangeDefault, onApplyAll, readOnly }) {
  const mode = deriveMode(assignments);
  const atSite = assignments.filter((a) => locationOf(a) === "event_site").length;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" /> Attendance location
          <Badge variant="outline" className="text-xs font-normal">{MODE_LABELS[mode]}</Badge>
        </h3>
        <p className="text-xs text-slate-500">
          {atSite} of {assignments.length} crew clock in at the event site
        </p>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">New assignments default to:</span>
          {["branch", "event_site"].map((loc) => (
            <Button
              key={loc}
              size="sm"
              variant={defaultLocation === loc ? "default" : "outline"}
              onClick={() => onChangeDefault(loc)}
            >
              {loc === "branch" ? "Branch" : "Event site"}
            </Button>
          ))}
          <span className="text-xs text-slate-400">·</span>
          <Button size="sm" variant="ghost" onClick={() => onApplyAll("branch")}>Set all to branch</Button>
          <Button size="sm" variant="ghost" onClick={() => onApplyAll("event_site")}>Set all to event site</Button>
        </div>
      )}

      {!event?.venue_lat && assignments.some((a) => locationOf(a) === "event_site") && (
        <p className="text-xs text-amber-700">
          Pin the venue on the map in the event form so site check-ins can be verified.
        </p>
      )}
    </Card>
  );
}