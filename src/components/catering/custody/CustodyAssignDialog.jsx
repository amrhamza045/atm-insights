import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import uniqBy from "lodash/uniqBy";
import { CUSTODY_STAGES, CUSTODY_LABELS } from "./custodyMeta";

export default function CustodyAssignDialog({ open, onOpenChange, trip, onDone }) {
  const [rows, setRows] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-with-email"],
    queryFn: () => base44.entities.Employee.list("-created_date", 500),
    enabled: open,
  });
  const staffWithEmail = uniqBy(
    employees.filter((e) => e.email && e.status !== "terminated" && e.status !== "inactive"),
    (e) => e.email.trim().toLowerCase()
  );

  useEffect(() => {
    if (open) {
      const initial = {};
      CUSTODY_STAGES.forEach((s) => {
        const a = (trip.custody_assignments || []).find((x) => x.stage === s);
        initial[s] = { email: a?.assigned_email || "", name: a?.assigned_name || "" };
      });
      setRows(initial);
    }
    // Keyed on the trip id only: depending on the whole trip object re-ran this
    // on every background refetch and wiped the change being typed.
  }, [open, trip?.id]);

  const pickEmployee = (stage, empId) => {
    const emp = staffWithEmail.find((e) => e.id === empId);
    if (emp) setRows({ ...rows, [stage]: { email: emp.email, name: emp.full_name || emp.name || "" } });
  };

  // A hand-typed email replaces the person, so the old name must not linger.
  const setEmail = (stage, email) =>
    setRows({ ...rows, [stage]: { email: email.trim(), name: "" } });

  const clearStage = (stage) => setRows({ ...rows, [stage]: { email: "", name: "" } });

  const save = async () => {
    setSaving(true);
    try {
      const custody_assignments = CUSTODY_STAGES.filter((s) => rows[s]?.email).map((s) => ({
        stage: s,
        assigned_email: rows[s].email.toLowerCase(),
        assigned_name: rows[s].name || "",
      }));
      const res = await base44.functions.invoke("assignCustodyStages", {
        trip_id: trip.id,
        custody_assignments,
      });
      if (res.data?.error) throw new Error(res.data.error);
      const notified = res.data?.notified?.length || 0;
      toast.success(
        notified > 0
          ? `Saved — ${notified} ${notified === 1 ? "person" : "people"} notified of their handover`
          : "Stage assignments saved"
      );
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(e.message || "Could not save assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign stage responsibility</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Each assigned person is the only one who can confirm their stage (admins can always override), and is notified
            in the app and by email as soon as you save — that notification is how the equipment moves to the next person.
            Pick someone else or press Clear to change a stage. Leave a stage empty to keep the default: driver for
            dispatch and delivery, any staff member for the return.
          </p>
          {CUSTODY_STAGES.map((s) => (
            <div key={s} className="space-y-1.5">
              <Label className="text-xs font-semibold">{CUSTODY_LABELS[s]}</Label>
              <div className="flex gap-2">
                <Select
                  value={staffWithEmail.find((e) => e.email.toLowerCase() === (rows[s]?.email || "").toLowerCase())?.id || ""}
                  onValueChange={(v) => pickEmployee(s, v)}
                >
                  <SelectTrigger className="w-40 shrink-0 h-9 text-xs">
                    <SelectValue placeholder="Pick staff…" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffWithEmail.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {(e.full_name || e.name || e.email)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="email"
                  placeholder="or type an email…"
                  className="h-9 text-xs"
                  value={rows[s]?.email || ""}
                  onChange={(e) => setEmail(s, e.target.value)}
                />
              </div>
              {rows[s]?.email && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  Assigned to {rows[s].name || rows[s].email}
                  <button type="button" className="text-red-600 hover:underline" onClick={() => clearStage(s)}>
                    Clear
                  </button>
                </p>
              )}
            </div>
          ))}
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save assignments"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}