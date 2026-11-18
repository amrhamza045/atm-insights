import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => ({ value: String(i), label: d }));
const FIELDS = [
  { key: "shortfall_escalation_hour", label: "Catering shortfall escalation (daily)", options: HOURS },
  { key: "orphan_scan_weekday", label: "Catering orphan scan — day", options: DAYS },
  { key: "orphan_scan_hour", label: "Catering orphan scan — time", options: HOURS },
  { key: "permission_sync_hour", label: "Permission safety sync (nightly)", options: HOURS },
  { key: "daily_summary_hour", label: "Daily Financial Summary email", options: HOURS },
];
const NUMBERS = [
  { key: "custody_delay_hours", label: "Custody delay before escalation (hours)" },
  { key: "default_lead_time_days", label: "Default material lead time (days)" },
  { key: "default_low_stock_threshold", label: "Default low-stock threshold" },
  { key: "catering_default_expected_hours", label: "Catering staff: default expected hours" },
  { key: "catering_min_actual_hours", label: "Catering staff: minimum hours worked" },
  { key: "catering_default_start_hour", label: "Catering staff: default start hour (0–23)" },
  { key: "record_job_min_gap_minutes", label: "Record-change jobs: minimum gap per record (minutes, 0 = none)" },
];

export default function ScheduleSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { data: rec, isLoading } = useQuery({
    queryKey: ["scheduleSettings"],
    queryFn: async () => (await base44.entities.ScheduleSettings.filter({ setting_key: "schedules" }))[0] || null,
  });
  useEffect(() => { if (rec) setForm(rec); }, [rec]);

  const save = async () => {
    setSaving(true);
    const data = { setting_key: "schedules" };
    [...FIELDS, ...NUMBERS].forEach((f) => { data[f.key] = form[f.key] === undefined || form[f.key] === null ? null : Number(form[f.key]); });
    if (rec) await base44.entities.ScheduleSettings.update(rec.id, data);
    else await base44.entities.ScheduleSettings.create(data);
    await qc.invalidateQueries({ queryKey: ["scheduleSettings"] });
    setSaving(false);
    toast.success("Schedules saved");
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  return (
    <Card>
      <CardHeader><CardTitle>Automatic job schedules & settings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">Times use the company timezone. A job with no time set does not run.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}</Label>
              <Select value={form[f.key] == null ? "" : String(form[f.key])} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>{f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
          {NUMBERS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}</Label>
              <Input type="number" min="0" placeholder="Not set" value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value === "" ? null : e.target.value })} />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save schedules</Button>
      </CardContent>
    </Card>
  );
}