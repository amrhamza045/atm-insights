import React, { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import EventScopeNotice from "./EventScopeNotice";
import RoleCoverageCard from "./RoleCoverageCard";
import AssignStaffDialog from "./AssignStaffDialog";
import EventLaborCostCard from "./EventLaborCostCard";
import { getStaffingRoles, suggestRequirements, mergeSuggestion, recalcStaffing, releaseAssignment, staffingAlert } from "./staffing";
import AttendanceLocationCard from "./AttendanceLocationCard";

import { useCateringEditAccess } from "./useCateringEditAccess";

export default function StaffingTab({ event }) {
  const { canEditRecord } = useCateringEditAccess();
  const canWrite = canEditRecord(event);
  const queryClient = useQueryClient();
  const [assigning, setAssigning] = useState(null);
  const [defaultLocation, setDefaultLocation] = useState("branch");
  const countSaveQueue = useRef(Promise.resolve());

  const { data: roles = [] } = useQuery({ queryKey: ["catering-staffing-roles"], queryFn: getStaffingRoles });

  const { data: assignments = [] } = useQuery({
    queryKey: ["catering-assignments", event?.id],
    queryFn: () => base44.entities.CateringAssignment.filter({ event_id: event.id, status: "confirmed" }),
    enabled: !!event?.id,
  });

  if (!event) return <EventScopeNotice />;

  const requirements = event.staffing_requirements || [];
  const alert = staffingAlert(event);
  const quoteTotal = Number(event.quote_total) || 0;
  const labor = Number(event.estimated_labor_cost) || 0;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-assignments"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-linked-event"] }),
    ]);
  };

  const saveRequirements = async (next, currentEvent = event) => {
    await base44.entities.CateringEvent.update(currentEvent.id, { staffing_requirements: next });
    await recalcStaffing({ ...currentEvent, staffing_requirements: next });
    await refresh();
  };

  const applySuggestion = async () => {
    const currentEvent = await base44.entities.CateringEvent.get(event.id);
    const currentRequirements = currentEvent.staffing_requirements || [];
    const suggested = suggestRequirements(currentEvent, roles);
    if (suggested.length === 0) return toast.error("No staffing ratios configured for this event type");
    await saveRequirements(mergeSuggestion(currentRequirements, suggested), currentEvent);
    toast.success(`Staffing plan re-suggested for ${currentEvent.expected_guests} guests — adjust as needed`);
  };

  const changeCount = (roleName, count) => {
    const save = countSaveQueue.current.then(async () => {
      const currentEvent = await base44.entities.CateringEvent.get(event.id);
      const currentRequirements = currentEvent.staffing_requirements || [];
      await saveRequirements(
        currentRequirements.map((r) => (r.role_name === roleName ? { ...r, required_count: count } : r)),
        currentEvent
      );
    });
    countSaveQueue.current = save.catch(() => {});
    return save;
  };

  const applyLocationToAll = async (loc) => {
    setDefaultLocation(loc);
    await Promise.all(
      assignments
        .filter((a) => (a.check_in_location_type || "branch") !== loc)
        .map((a) => base44.entities.CateringAssignment.update(a.id, { check_in_location_type: loc }))
    );
    toast.success(loc === "branch" ? "All crew clock in at the branch" : "All crew clock in at the event site");
    await refresh();
  };

  const setAssignmentLocation = async (assignment, loc) => {
    await base44.entities.CateringAssignment.update(assignment.id, { check_in_location_type: loc });
    toast.success(`${assignment.employee_name} now clocks in at the ${loc === "branch" ? "branch" : "event site"}`);
    await refresh();
  };

  const release = async (assignment) => {
    const user = await base44.auth.me();
    await releaseAssignment({ assignment, userEmail: user?.email, reason: "Released from staffing plan", event });
    toast.success("Assignment released and its shift cancelled");
    await refresh();
  };

  return (
    <div className="space-y-4">
      {alert && (
        <Card className="p-3 border-red-200 bg-red-50 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-700">{alert}</p>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" /> Staffing plan
            <Badge variant="outline" className="text-xs font-normal">{event.staffing_status || "none"}</Badge>
          </h3>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={applySuggestion} disabled={!canWrite}>
            <Sparkles className="w-4 h-4" /> Suggest from {event.expected_guests} guests
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Headcount</p>
            <p className="font-semibold text-slate-900">{event.staffing_assigned_count || 0}/{event.staffing_required_count || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Unfilled critical</p>
            <p className={`font-semibold ${(event.staffing_unfilled_critical_count || 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {event.staffing_unfilled_critical_count || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Estimated labor cost</p>
            <p className="font-semibold text-amber-700">{formatCurrency(labor)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Margin after labor</p>
            <p className="font-semibold text-slate-900">
              {quoteTotal > 0 ? formatCurrency(quoteTotal - labor) : "—"}
            </p>
          </div>
        </div>
      </Card>

      <AttendanceLocationCard
        event={event}
        assignments={assignments}
        defaultLocation={defaultLocation}
        onChangeDefault={setDefaultLocation}
        onApplyAll={applyLocationToAll}
        readOnly={event.status === "cancelled" || event.status === "completed"}
      />

      {requirements.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          No staffing plan yet — use “Suggest from guest count” to start, then adjust the numbers.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {requirements.map((req) => (
            <RoleCoverageCard
              key={req.role_name}
              requirement={req}
              assignments={assignments.filter((a) => a.role_name === req.role_name)}
              onChangeCount={(c) => changeCount(req.role_name, c)}
              onAssign={() => setAssigning({ requirement: req, role: roles.find((r) => r.name === req.role_name) || null })}
              onRelease={release}
              onSetLocation={setAssignmentLocation}
              readOnly={event.status === "cancelled" || event.status === "completed"}
            />
          ))}
        </div>
      )}

      <EventLaborCostCard event={event} />

      {assigning && (
        <AssignStaffDialog
          open
          onClose={() => setAssigning(null)}
          event={event}
          requirement={assigning.requirement}
          role={assigning.role}
          defaultLocation={defaultLocation}
          onDone={refresh}
        />
      )}
    </div>
  );
}