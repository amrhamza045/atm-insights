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

const pay = (h, f) => [h != null ? `${h}/hr` : null, f != null ? `${f}/month` : null].filter(Boolean).join(" · ") || "—";

export default function SalaryRevisionsSection({ employee, canPropose, canDecide }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ new_hourly_rate: "", new_fixed_salary: "", effective_date: "", reason: "" });
  const { data, isLoading, error } = useQuery({
    queryKey: ["lifetime", "salary", employee.id],
    queryFn: () => base44.entities.SalaryRevision.filter({ employee_record_id: employee.id }, "-proposed_at", 100),
  });
  const rows = data || [];
  const propose = useMutation({
    mutationFn: () => lifecycle({ action: "proposeSalaryRevision", employee_record_id: employee.id, ...f }),
    onSuccess: () => {
      toast.success("Proposal submitted for review");
      setOpen(false); setF({ new_hourly_rate: "", new_fixed_salary: "", effective_date: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["lifetime"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Salary revisions</h3>
        {canPropose && <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>{open ? "Close" : "Propose revision"}</Button>}
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-md">
          <div><Label>New hourly rate</Label><Input type="number" min="0" value={f.new_hourly_rate} onChange={set("new_hourly_rate")} /></div>
          <div><Label>New fixed salary</Label><Input type="number" min="0" value={f.new_fixed_salary} onChange={set("new_fixed_salary")} /></div>
          <div><Label>Effective date</Label><Input type="date" value={f.effective_date} onChange={set("effective_date")} /></div>
          <div className="col-span-2"><Label>Reason</Label><Textarea rows={2} value={f.reason} onChange={set("reason")} /></div>
          <Button className="col-span-2" disabled={propose.isPending || !f.effective_date || !f.reason.trim() || (f.new_hourly_rate === "" && f.new_fixed_salary === "")} onClick={() => propose.mutate()}>
            {propose.isPending ? "Submitting…" : "Submit for review"}
          </Button>
        </div>
      )}
      {isLoading ? <p className="text-sm text-slate-500">Loading…</p>
        : error ? <p className="text-sm text-red-600">Could not load salary revisions.</p>
        : rows.length === 0 ? <p className="text-sm text-slate-500">No salary revisions recorded.</p>
        : rows.map((r) => (
          <div key={r.id} className="border rounded-md p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{pay(r.prior_hourly_rate, r.prior_fixed_salary)} → {pay(r.new_hourly_rate, r.new_fixed_salary)}</span>
              <Badge className={STATUS_STYLE[r.status]}>{r.status}</Badge>
            </div>
            <p className="text-slate-600">{r.reason}</p>
            <p className="text-xs text-slate-500">Effective {fmtDate(r.effective_date)} · proposed by {r.proposed_by} on {fmtDate(r.proposed_at)}
              {r.decided_at && ` · ${r.status} by ${r.decided_by} on ${fmtDate(r.decided_at)}`}{r.decision_note && ` — ${r.decision_note}`}</p>
            {r.status === "pending" && canDecide && <DecisionActions action="decideSalaryRevision" id={r.id} />}
          </div>
        ))}
    </div>
  );
}