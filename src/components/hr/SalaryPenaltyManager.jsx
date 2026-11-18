import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import PenaltyFilterPopover from "@/components/hr/penalties/PenaltyFilterPopover";
import { EMPTY_PEN_FILTERS, filterPenalties, groupPenalties } from "@/components/hr/penalties/penaltyFilters";

const PENALTY_TYPES = [
  { value: "late_arrival", label: "Late Arrival" },
  { value: "absence", label: "Absence" },
  { value: "early_leave", label: "Early Leave" },
  { value: "misconduct", label: "Misconduct" },
  { value: "damage", label: "Damage" },
  { value: "other", label: "Other" }
];

export default function SalaryPenaltyManager() {
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState(EMPTY_PEN_FILTERS);
  const [groupBy, setGroupBy] = useState("none");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    employee_id: "", penalty_type: "other", amount: "", description: "",
    incident_date: new Date().toISOString().split("T")[0],
    apply_to_month: new Date().toISOString().slice(0, 7) + "-01"
  });

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", selectedBranchId, "active"],
    queryFn: () => base44.entities.Employee.filter({ status: "active", ...(!selectedBranchId ? {} : { branch_id: selectedBranchId }) }).then(excludeSystemAccounts)
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ["salaryPenalties", selectedBranchId],
    queryFn: () => base44.entities.SalaryPenalty.filter(selectedBranchId ? { branch_id: selectedBranchId } : {}, "-incident_date")
  });

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const emp = employees.find(e => e.id === data.employee_id);
      return base44.entities.SalaryPenalty.create({
        ...data,
        employee_name: emp?.name || "",
        amount: parseFloat(data.amount),
        status: "pending",
        created_by: currentUser?.email || "",
        branch_id: selectedBranchId,
        branch_name: selectedBranch?.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salaryPenalties"] });
      toast.success("Penalty recorded");
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalaryPenalty.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["salaryPenalties"] }); toast.success("Removed"); }
  });

  const filteredPenalties = filterPenalties(
    filterMonth ? penalties.filter(p => p.apply_to_month?.startsWith(filterMonth)) : penalties,
    filters
  );
  const typeLabel = (v) => PENALTY_TYPES.find(t => t.value === v)?.label || v || "—";
  const groups = groupPenalties(filteredPenalties, groupBy, typeLabel);

  const statusColor = { pending: "bg-warning-100 text-warning-700", applied: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
  const typeColor = { late_arrival: "bg-warning-100 text-warning-700", absence: "bg-red-100 text-red-700", misconduct: "bg-red-200 text-red-800", damage: "bg-purple-100 text-purple-700", early_leave: "bg-warning-100 text-warning-700", other: "bg-slate-100 text-slate-700" };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Penalties & Deductions</h3>
        <div className="flex gap-2 items-center">
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-40" />
          <PenaltyFilterPopover filters={filters} setFilters={setFilters} groupBy={groupBy} setGroupBy={setGroupBy} types={PENALTY_TYPES} />
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Penalty</Button>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map(g => (
          <div key={g.label || "all"} className="space-y-3">
            {g.label && (
              <div className="flex justify-between bg-slate-100 rounded px-3 py-1.5 text-sm font-semibold text-slate-700">
                <span>{g.label} ({g.items.length})</span>
                <span className="text-red-600">-EGP {g.total.toFixed(2)}</span>
              </div>
            )}
            {g.items.map(p => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{p.employee_name}</span>
                    <Badge className={typeColor[p.penalty_type] || ""}>{PENALTY_TYPES.find(t => t.value === p.penalty_type)?.label || p.penalty_type}</Badge>
                    <Badge className={statusColor[p.status] || ""}>{p.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{p.description}</p>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Incident: {p.incident_date}</span>
                    <span>Apply to: {p.apply_to_month?.slice(0, 7)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-red-600">-EGP {p.amount?.toFixed(2)}</span>
                  {p.status === "pending" && (
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
            ))}
          </div>
        ))}
        {filteredPenalties.length === 0 && <p className="text-slate-400 text-center py-8">No penalties for this month</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Penalty / Deduction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Penalty Type</Label>
                <Select value={form.penalty_type} onValueChange={v => setForm(f => ({ ...f, penalty_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PENALTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (EGP)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. 30 min late on 2026-06-01" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Incident Date</Label>
                <Input type="date" value={form.incident_date} onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))} />
              </div>
              <div>
                <Label>Apply to Month</Label>
                <Input type="month" value={form.apply_to_month?.slice(0, 7)} onChange={e => setForm(f => ({ ...f, apply_to_month: e.target.value + "-01" }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.employee_id || !form.amount}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}