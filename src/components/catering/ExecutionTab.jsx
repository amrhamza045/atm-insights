import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Truck, Users, Clock, MapPin, AlertTriangle } from "lucide-react";
import { LOCATION_LABELS } from "./attendanceLocation";
import EventScopeNotice from "./EventScopeNotice";
import { STAGE_LABELS } from "./logisticsLogic";
import {
  loadExecutionData,
  productionProgress,
  dispatchProgress,
  attendanceRollup,
  eventRisks,
} from "./executionLogic";
import RiskPanel from "./RiskPanel";

function ProgressCard({ icon: Icon, title, percent, label, children }) {
  return (
    <Card className="p-4 space-y-2">
      <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-slate-400" /> {title}
      </p>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-slate-600">{label} · {percent}%</p>
      {children}
    </Card>
  );
}

export default function ExecutionTab({ event }) {
  const { data, isLoading } = useQuery({
    queryKey: ["catering-execution", event?.id],
    queryFn: () => loadExecutionData(event),
    enabled: !!event?.id,
    refetchInterval: 60000,
  });

  if (!event) return <EventScopeNotice />;
  if (isLoading || !data) return <p className="text-sm text-slate-500">Loading live status…</p>;

  const prod = productionProgress(data.orders);
  const dispatch = dispatchProgress(data.trips);
  const crew = attendanceRollup(data.assignments, data.attendance, event);
  const risks = eventRisks(event, data);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-sm font-medium text-slate-900">{event.event_name}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {event.event_date} {event.start_time || ""}–{event.end_time || ""} · {event.location_type === "off_site" ? event.venue_name || "Off-site" : "On-site"} · {event.expected_guests} expected
        </p>
        <Badge className="mt-2 bg-indigo-100 text-indigo-700 text-xs">{event.status?.replace(/_/g, " ")}</Badge>
      </Card>

      <RiskPanel risks={risks} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ProgressCard icon={ChefHat} title="Production" percent={prod.percent} label={prod.label}>
          {prod.total > 0 && (
            <p className="text-xs text-slate-500">{prod.inProgress} in progress · {prod.pending} not started</p>
          )}
        </ProgressCard>

        <ProgressCard icon={Truck} title="Dispatch" percent={dispatch.percent} label={dispatch.label}>
          <div className="space-y-0.5">
            {dispatch.stages.map((s) => (
              <p key={s.id} className="text-xs text-slate-500 truncate">{s.name} — {STAGE_LABELS[s.stage]}</p>
            ))}
          </div>
        </ProgressCard>

        <ProgressCard icon={Users} title="Crew attendance" percent={crew.percent} label={crew.label} />
      </div>

      <Card className="p-0 overflow-hidden">
        <p className="text-sm font-semibold text-slate-900 px-4 py-3 border-b">Crew on the day</p>
        {crew.rows.length === 0 ? (
          <p className="text-sm text-slate-400 p-4">No crew assigned — staff the event in the Staffing tab.</p>
        ) : (
          <div className="divide-y">
            {crew.rows.map((r) => (
              <div key={r.assignment.id} className="flex items-center justify-between gap-2 px-4 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 truncate">{r.assignment.employee_name}</p>
                  <p className="text-xs text-slate-500">
                    {r.assignment.role_name} · {r.assignment.start_time}–{r.assignment.end_time}
                  </p>
                  {r.warnings.map((w) => (
                    <p key={w} className="text-xs text-warning-700 flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />{w}
                    </p>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-xs gap-1">
                    <MapPin className="w-3 h-3" />{LOCATION_LABELS[r.expectedLocation]}
                  </Badge>
                  {r.site && (
                    <Badge className={`text-xs ${r.site.onSite ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {r.site.onSite ? "at venue" : `${r.site.distance}m off`}
                    </Badge>
                  )}
                  {r.late > 0 && <Badge className="bg-warning-100 text-warning-700 text-xs gap-1"><Clock className="w-3 h-3" />{r.late}m late</Badge>}
                  <Badge className={`text-xs ${r.clockedOut ? "bg-slate-200 text-slate-700" : r.clockedIn ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {r.clockedOut ? "clocked out" : r.clockedIn ? "clocked in" : "not clocked in"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-500">
        Attendance comes from the existing clock-in system via each crew member's catering shift — nothing separate to record here.
      </p>
    </div>
  );
}