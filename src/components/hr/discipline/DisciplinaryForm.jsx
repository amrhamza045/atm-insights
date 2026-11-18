import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ACTION_TYPES } from "./disciplineMeta";
import { useBranch } from "@/components/branches/BranchContext";

const blank = (employeeId) => ({
  employee_id: employeeId || "", action_type: "verbal_warning",
  action_date: new Date().toISOString().slice(0, 10),
  reason: "", details: "", outcome: "", attachments: [],
});

export default function DisciplinaryForm({ open, onClose, record, defaultEmployeeId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => record ? { ...blank(), ...record } : blank(defaultEmployeeId));
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Employees of the branch picked at the top
  const { selectedBranchId } = useBranch();
  const { data: employees = [] } = useQuery({
    queryKey: ["disciplineEmployees", selectedBranchId],
    queryFn: async () => (await base44.entities.Employee.filter(selectedBranchId ? { branch_id: selectedBranchId } : {}, { sort: "name", limit: 500 })).items,
  });

  const save = useMutation({
    mutationFn: async () => {
      const emp = employees.find((e) => e.id === form.employee_id);
      const me = await base44.auth.me();
      const data = {
        employee_id: form.employee_id, employee_name: emp?.name || form.employee_name,
        branch_id: emp?.branch_id || form.branch_id, branch_name: emp?.branch_name || form.branch_name,
        action_type: form.action_type, action_date: form.action_date,
        reason: form.reason, details: form.details, outcome: form.outcome, attachments: form.attachments,
      };
      return record
        ? base44.entities.DisciplinaryAction.update(record.id, data)
        : base44.entities.DisciplinaryAction.create({ ...data, recorded_by: me.email });
    },
    onSuccess: () => {
      toast.success("Disciplinary record saved");
      qc.invalidateQueries({ queryKey: ["disciplinaryActions"] });
      onClose();
    },
    onError: (e) => toast.error(e?.message || "Could not save the record"),
  });

  const upload = async (files) => {
    setUploading(true);
    try {
      const added = [];
      for (const file of files) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        added.push({ name: file.name, file_uri });
      }
      set("attachments", [...form.attachments, ...added]);
    } catch (e) {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  const valid = form.employee_id && form.action_date && form.reason.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{record ? "Edit" : "New"} disciplinary record</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Employee</Label>
            <Select value={form.employee_id} onValueChange={(v) => set("employee_id", v)} disabled={!!record}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Action type</Label>
              <Select value={form.action_type} onValueChange={(v) => set("action_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.action_date} onChange={(e) => set("action_date", e.target.value)} /></div>
          </div>
          <div><Label>Reason</Label><Input value={form.reason} onChange={(e) => set("reason", e.target.value)} /></div>
          <div><Label>Case details / minutes</Label><Textarea rows={5} value={form.details} onChange={(e) => set("details", e.target.value)} /></div>
          <div><Label>Outcome</Label><Textarea rows={2} value={form.outcome} onChange={(e) => set("outcome", e.target.value)} /></div>
          <div>
            <Label>Supporting documents</Label>
            <div className="space-y-1 mt-1">
              {form.attachments.map((a, i) => (
                <div key={a.file_uri} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2 py-1">
                  <span className="flex items-center gap-2 truncate"><Paperclip className="w-3 h-3" />{a.name}</span>
                  <button type="button" onClick={() => set("attachments", form.attachments.filter((_, j) => j !== i))}><X className="w-4 h-4 text-slate-500" /></button>
                </div>
              ))}
              <Input type="file" multiple disabled={uploading} onChange={(e) => { upload([...e.target.files]); e.target.value = ""; }} />
              {uploading && <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading… (stored privately)</p>}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={!valid || save.isPending || uploading} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}