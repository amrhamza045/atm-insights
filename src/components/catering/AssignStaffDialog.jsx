import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Star } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import { buildCandidates, confirmAssignment, defaultWindow, hoursBetween } from "./staffing";

export default function AssignStaffDialog({ open, onClose, event, requirement, role, onDone, defaultLocation = "branch" }) {
  const { selectedBranch, selectedBranchId } = useBranch();
  const [window, setWindow] = useState(defaultWindow(event));
  const [checkInLocation, setCheckInLocation] = useState(defaultLocation);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [rateOverride, setRateOverride] = useState("");

  const { data: candidates = [], isLoading, refetch } = useQuery({
    queryKey: ["staff-candidates", event.id, requirement.role_name, window.start_time, window.end_time],
    queryFn: () => buildCandidates({ event, role, window, branchId: selectedBranchId }),
    enabled: open,
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter(
      (c) => (showUnavailable || c.available) && (!q || c.employee.name.toLowerCase().includes(q) || (c.employee.position || "").toLowerCase().includes(q))
    );
  }, [candidates, showUnavailable, query]);

  const hours = hoursBetween(window.start_time, window.end_time);

  const assign = async (candidate) => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await confirmAssignment({
        event,
        role,
        requirement,
        candidate: { ...candidate, rateOverride },
        window,
        branch: selectedBranch,
        userEmail: user?.email,
        override: candidate.available ? null : { reason: overrideReason },
        checkInLocation,
      });
      toast.success(`${candidate.employee.name} assigned — shift created for ${event.event_date}`);
      setOverrideReason("");
      await refetch();
      onDone?.();
    } catch (err) {
      toast.error(err?.message || "Could not assign this person");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign {requirement.role_name} — {event.event_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <div>
              <Label className="text-xs">Call time</Label>
              <Input type="time" className="h-8" value={window.start_time} onChange={(e) => setWindow({ ...window, start_time: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Release time</Label>
              <Input type="time" className="h-8" value={window.end_time} onChange={(e) => setWindow({ ...window, end_time: e.target.value })} />
            </div>
            <div className="text-xs text-slate-600">{hours} h shift</div>
            <div className="flex items-center gap-2">
              <Switch checked={showUnavailable} onCheckedChange={setShowUnavailable} id="show-unavail" />
              <Label htmlFor="show-unavail" className="text-xs">Show booked staff</Label>
            </div>
          </div>

          {(role?.required_skills || []).length > 0 && (
            <p className="text-xs text-slate-500">
              Preferred for this role: {role.required_skills.join(", ")} — used to rank candidates, not to block them.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs">Clocks in at:</Label>
            <Button size="sm" variant={checkInLocation === "branch" ? "default" : "outline"} onClick={() => setCheckInLocation("branch")}>Branch</Button>
            <Button size="sm" variant={checkInLocation === "event_site" ? "default" : "outline"} onClick={() => setCheckInLocation("event_site")}>Event site</Button>
          </div>

          <Input placeholder="Search by name or position" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8" />

          <div>
            <Label className="text-xs">Rate for this assignment (EGP/h) — for freelance or temporary staff with no rate on record</Label>
            <Input
              type="number"
              min="0"
              className="h-8"
              value={rateOverride}
              onChange={(e) => setRateOverride(e.target.value)}
              placeholder="Leave empty to use their own or the role default rate"
            />
          </div>

          {showUnavailable && (
            <div>
              <Label className="text-xs">Override reason (required to double-book someone)</Label>
              <Input className="h-8" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Why is this clash acceptable?" />
            </div>
          )}

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-slate-500">Checking availability…</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-slate-500">No available staff for this window. Turn on “Show booked staff” to override, or add a freelancer in HR.</p>
            ) : (
              visible.map((c) => (
                <div key={c.employee.id} className="rounded-lg border border-slate-200 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {c.employee.name}
                      <span className="text-slate-500 font-normal"> · {c.employee.position || "—"}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {c.positionMatch && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Role match</Badge>}
                      {(c.employee.employment_type || "regular") !== "regular" && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">{c.employee.employment_type}</Badge>
                      )}
                      {c.matchedSkills.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                      {(c.employee.catering_events_worked || 0) > 0 && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Star className="w-3 h-3" /> {c.employee.catering_events_worked} event(s), up to {c.employee.largest_event_guests || 0} guests
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {c.rateSource !== "none" ? `${formatCurrency(c.cost)} for this event${c.rateSource === "role" ? " (role default)" : ""}` : "no rate on record"}
                      </Badge>
                    </div>
                    {!c.available && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {c.conflict}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={c.available ? "default" : "outline"}
                    disabled={saving || (!c.available && !overrideReason.trim())}
                    onClick={() => assign(c)}
                  >
                    {c.available ? "Assign" : "Override & assign"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}