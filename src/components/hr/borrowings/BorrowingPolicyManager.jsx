import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import { policyError } from "@/components/hr/borrowings/BorrowingWindowPicker";

const NEW_WINDOW = { day: 1, percent: 10, cutoff_days_before: 2, cutoff_time: "17:00" };

export default function BorrowingPolicyManager() {
  const queryClient = useQueryClient();
  const [policy, setPolicy] = useState(null);

  const { data } = useQuery({
    queryKey: ["borrowingPolicy"],
    queryFn: () => base44.functions.invoke("employeeBorrowing", { action: "getPolicy" }).then(r => r.data.policy),
  });
  useEffect(() => { if (data) setPolicy(data); }, [data]);

  const save = useMutation({
    mutationFn: () => base44.functions.invoke("employeeBorrowing", { action: "savePolicy", policy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["borrowingPolicy"] });
      queryClient.invalidateQueries({ queryKey: ["borrowingOptions"] });
      toast.success("Advance policy saved");
    },
    onError: (e) => toast.error(policyError(e)),
  });

  if (!policy) return <p className="text-slate-400 text-center py-8">Loading…</p>;

  const setWindow = (i, k, v) => setPolicy(p => ({ ...p, windows: p.windows.map((w, j) => j === i ? { ...w, [k]: v } : w) }));
  const total = policy.windows.reduce((s, w) => s + (Number(w.percent) || 0), 0);

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings className="w-4 h-4" /> Advance Policy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {policy.is_default && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Showing the default policy — nothing has been saved yet. It is already being applied.</p>}
          <div className="flex items-center gap-3">
            <Switch checked={policy.enabled !== false} onCheckedChange={v => setPolicy(p => ({ ...p, enabled: v }))} />
            <Label>Enforce the advance policy</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Maximum % of monthly salary</Label>
              <Input type="number" min="1" max="100" value={policy.max_percent_of_salary} onChange={e => setPolicy(p => ({ ...p, max_percent_of_salary: e.target.value }))} />
            </div>
            <div>
              <Label>Minimum notice (hours)</Label>
              <Input type="number" min="0" value={policy.min_notice_hours} onChange={e => setPolicy(p => ({ ...p, min_notice_hours: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Disbursement windows <span className="text-slate-500 font-normal">(total {total}%)</span></Label>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setPolicy(p => ({ ...p, windows: [...p.windows, { ...NEW_WINDOW }] }))}><Plus className="w-3 h-3" /> Add window</Button>
            </div>
            <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-slate-500">
              <span>Day of month</span><span>% of salary</span><span>Stop accepting (days before)</span><span>Cutoff time</span><span className="w-9" />
            </div>
            {policy.windows.map((w, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <Input type="number" min="1" max="31" value={w.day} onChange={e => setWindow(i, "day", e.target.value)} />
                <Input type="number" min="1" max="100" value={w.percent} onChange={e => setWindow(i, "percent", e.target.value)} />
                <Input type="number" min="0" max="31" value={w.cutoff_days_before} onChange={e => setWindow(i, "cutoff_days_before", e.target.value)} />
                <Input type="time" value={w.cutoff_time} onChange={e => setWindow(i, "cutoff_time", e.target.value)} />
                <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setPolicy(p => ({ ...p, windows: p.windows.filter((_, j) => j !== i) }))}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <p className="text-xs text-slate-500">Requests close at the cutoff time, the chosen number of days before the disbursement day (company timezone), and never later than the minimum notice before disbursement. Days beyond a short month fall on its last day.</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Save policy</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}