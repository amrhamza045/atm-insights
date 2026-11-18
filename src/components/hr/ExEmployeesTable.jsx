import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Mail, Phone, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DeleteEmployeeButton from "@/components/hr/DeleteEmployeeButton";
import { useBranch } from "@/components/branches/BranchContext";

export default function ExEmployeesTable({ canEdit }) {
  const queryClient = useQueryClient();
  const { selectedBranchId } = useBranch();
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["exEmployees", selectedBranchId],
    queryFn: async () => (await base44.entities.ExEmployee.filter(selectedBranchId ? { branch_id: selectedBranchId } : {}, { sort: "-deleted_at", limit: 200 })).items,
  });
  const del = useMutation({
    mutationFn: (rec) => base44.entities.ExEmployee.delete(rec.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["exEmployees"] }); toast.success("Record permanently deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const restore = useMutation({
    mutationFn: async (r) => {
      await base44.entities.Employee.create({
        employee_id: r.employee_id, name: r.name, email: r.email, phone: r.phone,
        position: r.position, department: r.department, branch_id: r.branch_id, branch_name: r.branch_name,
        employment_type: r.employment_type || "regular", hire_date: r.hire_date,
        salary_type: r.salary_type, hourly_rate: r.hourly_rate, fixed_salary: r.fixed_salary,
        status: "active",
      });
      await base44.entities.ExEmployee.delete(r.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exEmployees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee restored to the active list. Staff access must be granted again.");
    },
    onError: (e) => toast.error(e.message),
  });
  const th = "px-4 py-3 text-left font-semibold text-slate-700";
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b"><tr>
          <th className={th}>Name / ID</th><th className={th}>Position</th><th className={th}>Department</th>
          <th className={th}>Contact</th><th className={th}>Hire Date</th><th className={th}>Deleted</th><th className={th}>Actions</th>
        </tr></thead>
        <tbody className="bg-white">
          {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
          : list.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No ex-employees</td></tr>
          : list.map(r => (
            <tr key={r.id} className="border-b hover:bg-slate-50">
              <td className="px-4 py-3"><p className="font-medium text-slate-900">{r.name}</p><p className="text-xs text-slate-500">{r.employee_id}</p></td>
              <td className="px-4 py-3 text-slate-600">{r.position || "—"}</td>
              <td className="px-4 py-3 text-slate-600">{r.department || "—"}</td>
              <td className="px-4 py-3 text-slate-600">
                {r.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</p>}
                {r.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</p>}
              </td>
              <td className="px-4 py-3 text-slate-600">{r.hire_date || "—"}</td>
              <td className="px-4 py-3 text-slate-600">{r.deleted_at?.slice(0, 10)}<p className="text-xs text-slate-400">{r.deleted_by}</p></td>
              <td className="px-4 py-3 flex items-center gap-1">{canEdit && (
                <Button size="sm" variant="outline" className="gap-1" disabled={restore.isPending} onClick={() => restore.mutate(r)}>
                  <Undo2 className="w-3 h-3" /> Restore
                </Button>
              )}{canEdit && (
                <DeleteEmployeeButton employee={r} disabled={del.isPending} onConfirm={() => del.mutate(r)}
                  description="Their archived record will be permanently removed. This cannot be undone." />
              )}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}