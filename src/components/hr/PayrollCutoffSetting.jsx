import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";

const KEY = "payroll_settings";
const OPTIONS = [...Array.from({ length: 31 }, (_, i) => String(i + 1)), "last"];
const label = (v) => (v === "last" ? "Last day of the month" : `Day ${v}`);

/** Admin setting: the monthly payroll cut-off day. Stores the choice only. */
export default function PayrollCutoffSetting() {
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  const canEdit = isAdmin || permissions?.settings_edit === true;
  const [value, setValue] = useState("last");

  const { data: record, isLoading } = useQuery({
    queryKey: ["payrollSettings"],
    queryFn: async () => (await base44.entities.PayrollSettings.filter({ setting_key: KEY }))[0] || null,
  });
  const saved = record?.payroll_cutoff_day;
  useEffect(() => { if (saved) setValue(saved); }, [saved]);

  const save = useMutation({
    mutationFn: () => record
      ? base44.entities.PayrollSettings.update(record.id, { payroll_cutoff_day: value })
      : base44.entities.PayrollSettings.create({ setting_key: KEY, payroll_cutoff_day: value }),
    onSuccess: () => { toast.success("Payroll cut-off saved"); qc.invalidateQueries({ queryKey: ["payrollSettings"] }); },
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 min-w-[220px]">
          <CalendarCheck className="w-5 h-5 text-slate-500" />
          <div>
            <p className="font-semibold text-slate-900">Monthly payroll cut-off</p>
            <p className="text-xs text-slate-500">
              {isLoading ? "Loading…" : saved ? `Saved: ${label(saved)}` : "Not set yet"}
            </p>
          </div>
        </div>
        <div className="w-56">
          <Select value={value} onValueChange={setValue} disabled={!canEdit}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{OPTIONS.map((o) => <SelectItem key={o} value={o}>{label(o)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {canEdit ? (
          <Button onClick={() => save.mutate()} disabled={save.isPending || value === saved} className="gap-2">
            {save.isPending ? "Saving…" : value === saved ? <><Check className="w-4 h-4" /> Saved</> : "Save"}
          </Button>
        ) : <p className="text-xs text-slate-500">Only administrators can change this.</p>}
      </CardContent>
    </Card>
  );
}