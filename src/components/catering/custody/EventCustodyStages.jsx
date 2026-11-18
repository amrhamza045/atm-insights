import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import uniqBy from "lodash/uniqBy";
import { CUSTODY_STAGES, CUSTODY_LABELS } from "./custodyMeta";

// Shown when an event has no trips (e.g. transport handled by a supplier):
// the three custody stages are still visible and each gets a responsible person.
export default function EventCustodyStages({ event, onTripCreated }) {
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState({});

  const { data: employees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["employees-with-email"],
    queryFn: () => base44.entities.Employee.list("-created_date", 500),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Keep the picker in sync when employees are added, edited or deactivated
  useEffect(() => base44.entities.Employee.subscribe(() => refetchEmployees()), [refetchEmployees]);
  const staff = uniqBy(
    employees.filter((e) => e.email && e.status !== "terminated" && e.status !== "inactive"),
    (e) => e.email.trim().toLowerCase()
  );

  const pick = (stage, empId) => {
    const emp = staff.find((e) => e.id === empId);
    if (!emp) return;
    setRows({ ...rows, [stage]: { assigned_email: emp.email.toLowerCase(), assigned_name: emp.full_name || emp.name || "", id: empId } });
  };

  const save = async () => {
    const custody_assignments = CUSTODY_STAGES.filter((s) => rows[s]?.assigned_email).map((s) => ({
      stage: s,
      assigned_email: rows[s].assigned_email,
      assigned_name: rows[s].assigned_name,
    }));
    if (custody_assignments.length === 0) return toast.error("Assign at least one custody stage");
    setSaving(true);
    try {
      const trip = await base44.entities.CateringTrip.create({
        event_id: event.id,
        event_name: event.event_name,
        event_date: event.event_date,
        branch_id: event.branch_id,
        branch_name: event.branch_name,
        trip_label: "Custody chain",
        custody_assignments: [],
      });
      const res = await base44.functions.invoke("assignCustodyStages", { trip_id: trip.id, custody_assignments });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Custody chain created and assignees notified");
      onTripCreated?.();
    } catch (e) {
      toast.error(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <p className="text-xs text-slate-500">
        No custody chain on {event.event_name} yet. Pick who is responsible for each stage to start it.
      </p>
      {CUSTODY_STAGES.map((s) => (
        <div key={s} className="space-y-1.5">
          <Label className="text-xs font-semibold">{CUSTODY_LABELS[s]}</Label>
          <Select value={rows[s]?.id || ""} onValueChange={(v) => pick(s, v)} disabled={saving}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Choose responsible employee…" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.full_name || e.name || e.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Create custody chain & notify assignees"}
      </Button>
    </Card>
  );
}