import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, PoundSterling, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import BorrowingWindowPicker, { policyError } from "@/components/hr/borrowings/BorrowingWindowPicker";
import PendingAdvanceReview from "@/components/hr/borrowings/PendingAdvanceReview";
import BorrowingFilterPopover from "@/components/hr/borrowings/BorrowingFilterPopover";
import { EMPTY_BOR_FILTERS, filterBorrowings, groupBorrowings } from "@/components/hr/borrowings/borrowingFilters";

export default function EmployeeBorrowingManager() {
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState(EMPTY_BOR_FILTERS);
  const [groupBy, setGroupBy] = useState("none");
  const [form, setForm] = useState({
    employee_id: "", amount: "", reason: "", payment_method: "", borrow_date: new Date().toISOString().split("T")[0],
    repayment_type: "installments", installment_months: 1,
    start_repayment_month: new Date().toISOString().slice(0, 7) + "-01"
  });

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", selectedBranchId, "active"],
    queryFn: () => base44.entities.Employee.filter({ status: "active", ...(!selectedBranchId ? {} : { branch_id: selectedBranchId }) }).then(excludeSystemAccounts)
  });

  const { data: borrowings = [] } = useQuery({
    queryKey: ["employeeBorrowings", selectedBranchId],
    queryFn: () => base44.entities.EmployeeBorrowing.filter(selectedBranchId ? { branch_id: selectedBranchId } : {}, "-borrow_date")
  });

  const createMutation = useMutation({
    // The server enforces the advance policy (windows, cutoff, notice, salary caps).
    mutationFn: (data) => base44.functions.invoke("employeeBorrowing", {
      action: "create",
      employee_id: data.employee_id,
      data: { ...data, branch_id: selectedBranchId, branch_name: selectedBranch?.name }
    }),
    onError: (e) => toast.error(policyError(e)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeBorrowings"] });
      queryClient.invalidateQueries({ queryKey: ["borrowingOptions"] });
      toast.success("Borrowing recorded");
      setShowForm(false);
      setForm({ employee_id: "", amount: "", reason: "", payment_method: "", borrow_date: new Date().toISOString().split("T")[0], repayment_type: "installments", installment_months: 1, start_repayment_month: new Date().toISOString().slice(0, 7) + "-01" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.EmployeeBorrowing.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employeeBorrowings"] }); toast.success("Updated"); }
  });

  const statusColor = { active: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };

  const filteredBorrowings = filterBorrowings(borrowings, filters);
  const groups = groupBorrowings(filteredBorrowings, groupBy);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Wallet className="w-5 h-5" /> Employee Borrowings</h3>
        <div className="flex items-center gap-2">
          <BorrowingFilterPopover filters={filters} setFilters={setFilters} groupBy={groupBy} setGroupBy={setGroupBy} />
          <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Borrowing</Button>
        </div>
      </div>

      {groups.map(g => (
      <div key={g.label || "all"} className="space-y-3">
        {g.label && (
          <div className="flex justify-between bg-slate-100 rounded px-3 py-1.5 text-sm font-semibold text-slate-700">
            <span>{g.label} ({g.items.length})</span>
            <span>Total EGP {g.total.toFixed(2)} · Remaining <span className="text-red-600">EGP {g.remaining.toFixed(2)}</span></span>
          </div>
        )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {g.items.map(b => (
          <Card key={b.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{b.employee_name}</p>
                  <p className="text-xs text-slate-500">{b.borrow_date}</p>
                </div>
                <Badge className={b.request_status === "pending" ? "bg-amber-100 text-amber-700" : b.request_status === "rejected" ? "bg-red-100 text-red-700" : (statusColor[b.status] || "")}>
                  {b.request_status === "pending" ? "pending HR review" : b.request_status === "rejected" ? "rejected" : b.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">{b.reason}</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Total:</span><span className="font-medium">EGP {b.amount?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Repaid:</span><span className="text-green-600">EGP {b.total_repaid?.toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-1"><span className="text-slate-500">Remaining:</span><span className="font-bold text-red-600">EGP {b.remaining_balance?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Monthly deduction:</span><span>EGP {b.amount_per_installment?.toFixed(2)}</span></div>
              </div>
              {(!b.request_status || b.request_status === "approved") && (
                <div className="bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                  <p className="text-xs text-slate-600 flex justify-between">
                    <span>Payout status:</span>
                    <strong className={b.payout_status === 'paid' ? 'text-green-600' : 'text-amber-600'}>{b.payout_status === 'paid' ? 'Paid' : 'Awaiting Finance'}</strong>
                  </p>
                  {b.payout_status === 'paid' && <p className="text-xs text-muted-foreground mt-1">Paid from {b.payout_source_type === 'custody' ? `${b.custody_holder_name} Custody` : b.payment_method_name}</p>}
                </div>
              )}
              {b.request_status === "pending" && <PendingAdvanceReview borrowing={b} />}
              {b.status === "active" && (!b.request_status || b.request_status === "approved") && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => updateStatusMutation.mutate({ id: b.id, status: "completed" })}>
                  Mark Completed
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
      ))}
      {filteredBorrowings.length === 0 && <p className="text-slate-400 text-center py-8">{borrowings.length === 0 ? "No borrowings recorded" : "No borrowings match the filters"}</p>}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Employee Borrowing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Amount (EGP)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <BorrowingWindowPicker employeeId={form.employee_id} value={form.borrow_date} onChange={v => setForm(f => ({ ...f, borrow_date: v }))} />
            <div>
              <Label>Reason</Label>
              <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div>
              <Label>Repayment Type</Label>
              <Select value={form.repayment_type} onValueChange={v => setForm(f => ({ ...f, repayment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="installments">Monthly Installments</SelectItem>
                  <SelectItem value="lump_sum">Lump Sum (next payroll)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.repayment_type === "installments" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Months</Label>
                  <Input type="number" min="1" value={form.installment_months} onChange={e => setForm(f => ({ ...f, installment_months: e.target.value }))} />
                </div>
                <div>
                  <Label>Start Month</Label>
                  <Input type="month" value={form.start_repayment_month?.slice(0, 7)} onChange={e => setForm(f => ({ ...f, start_repayment_month: e.target.value + "-01" }))} />
                </div>
              </div>
            )}
            {form.amount && form.installment_months && form.repayment_type === "installments" && (
              <p className="text-sm text-slate-600">Monthly deduction: <strong>EGP {(parseFloat(form.amount) / parseInt(form.installment_months)).toFixed(2)}</strong></p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.employee_id || !form.amount || !form.borrow_date}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}