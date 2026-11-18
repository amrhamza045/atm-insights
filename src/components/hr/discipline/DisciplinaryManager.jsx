import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useBranch } from "@/components/branches/BranchContext";
import { ACTION_TYPES } from "./disciplineMeta";
import DisciplinaryForm from "./DisciplinaryForm";
import DisciplinaryRecordCard from "./DisciplinaryRecordCard";

export default function DisciplinaryManager() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const employeeId = params.get("employee") || "";
  const [type, setType] = useState("all");
  const [editing, setEditing] = useState(null); // null | {} (new) | record
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  const canEdit = isAdmin || permissions?.hr_edit === true;
  const { selectedBranchId } = useBranch();

  const { data, isLoading } = useQuery({
    queryKey: ["disciplinaryActions", employeeId, type, selectedBranchId],
    queryFn: async () => {
      const q = selectedBranchId ? { branch_id: selectedBranchId } : {};
      if (employeeId) q.employee_id = employeeId;
      if (type !== "all") q.action_type = type;
      return (await base44.entities.DisciplinaryAction.filter(q, { sort: "-action_date", limit: 100 })).items;
    },
  });

  const del = useMutation({
    mutationFn: (r) => base44.entities.DisciplinaryAction.delete(r.id),
    onSuccess: () => { toast.success("Record deleted"); qc.invalidateQueries({ queryKey: ["disciplinaryActions"] }); },
  });

  const clearEmployee = () => { const p = new URLSearchParams(params); p.delete("employee"); setParams(p, { replace: true }); };
  const records = data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Disciplinary Actions</h2>
          <p className="text-sm text-slate-500">Verbal warnings, written notices and formal hearing minutes (محاضر تحقيق)</p>
        </div>
        {canEdit && <Button onClick={() => setEditing({})}><Plus className="w-4 h-4 mr-1" /> New record</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All action types</SelectItem>
            {ACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {employeeId && (
          <Button variant="outline" size="sm" onClick={clearEmployee}>
            Filtered to one employee <X className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-slate-500 border rounded-lg bg-white p-6 text-center">No disciplinary records found.</p>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <DisciplinaryRecordCard key={r.id} record={r} showEmployee
              onEdit={canEdit ? setEditing : undefined}
              onDelete={canEdit ? (rec) => window.confirm("Delete this record?") && del.mutate(rec) : undefined} />
          ))}
        </div>
      )}

      {editing && (
        <DisciplinaryForm open record={editing.id ? editing : null} defaultEmployeeId={employeeId}
          onClose={() => setEditing(null)} />
      )}
    </div>
  );
}