import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { lifecycle, STATUS_STYLE, fmtDate } from "./lifecycleApi";
import DecisionActions from "./DecisionActions";

const EMPTY = { period_start: "", period_end: "", rating: "3", assessment: "", goals: "", notes: "" };

export default function AppraisalsSection({ employee, canPropose, canDecide }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const { data, isLoading, error } = useQuery({
    queryKey: ["lifetime", "appraisal", employee.id],
    queryFn: () => base44.entities.PerformanceAppraisal.filter({ employee_record_id: employee.id }, "-period_end", 100),
  });
  const rows = data || [];
  const create = useMutation({
    mutationFn: () => lifecycle({ action: "createAppraisal", employee_record_id: employee.id, ...f }),
    onSuccess: () => { toast.success("Appraisal submitted for review"); setOpen(false); setF(EMPTY); qc.invalidateQueries({ queryKey: ["lifetime"] }); },
    onError: (e) => toast.error(e.message),
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Performance appraisals</h3>
        {canPropose && <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>{open ? "Close" : "New appraisal"}</Button>}
      </div>
      {open && (
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-md">
          <div><Label>Period start</Label><Input type="date" value={f.period_start} onChange={set("period_start")} /></div>
          <div><Label>Period end</Label><Input type="date" value={f.period_end} onChange={set("period_end")} /></div>
          <div><Label>Rating (1-5)</Label><Input type="number" min="1" max="5" step="0.5" value={f.rating} onChange={set("rating")} /></div>
          <div className="col-span-3"><Label>Assessment</Label><Textarea rows={2} value={f.assessment} onChange={set("assessment")} /></div>
          <div className="col-span-3"><Label>Goals</Label><Textarea rows={2} value={f.goals} onChange={set("goals")} /></div>
          <div className="col-span-3"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={set("notes")} /></div>
          <Button className="col-span-3" disabled={create.isPending || !f.period_start || !f.period_end || !f.assessment.trim()} onClick={() => create.mutate()}>
            {create.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      )}
      {isLoading ? <p className="text-sm text-slate-500">Loading…</p>
        : error ? <p className="text-sm text-red-600">Could not load appraisals.</p>
        : rows.length === 0 ? <p className="text-sm text-slate-500">No appraisals recorded.</p>
        : rows.map((r) => (
          <div key={r.id} className="border rounded-md p-3 text-sm space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{fmtDate(r.period_start)} → {fmtDate(r.period_end)} · {r.rating}/5</span>
              <Badge className={STATUS_STYLE[r.status]}>{r.status}</Badge>
            </div>
            <p>{r.assessment}</p>
            {r.goals && <p className="text-slate-600"><b>Goals:</b> {r.goals}</p>}
            {r.notes && <p className="text-slate-600"><b>Notes:</b> {r.notes}</p>}
            <p className="text-xs text-slate-500">By {r.proposed_by} on {fmtDate(r.proposed_at)}
              {r.decided_at && ` · ${r.status} by ${r.decided_by} on ${fmtDate(r.decided_at)}`}{r.decision_note && ` — ${r.decision_note}`}</p>
            {r.status === "pending" && canDecide && <DecisionActions action="decideAppraisal" id={r.id} />}
          </div>
        ))}
    </div>
  );
}