import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import MeetingForm from "./MeetingForm";
import { useBranch } from "@/components/branches/BranchContext";

const STATUS_COLOR = { scheduled: "bg-blue-100 text-blue-800", held: "bg-green-100 text-green-800", cancelled: "bg-slate-200 text-slate-700" };
const today = () => new Date().toISOString().slice(0, 10);

export default function MeetingsManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState("all");
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  const canEdit = isAdmin || permissions?.hr_edit === true;

  const { selectedBranchId } = useBranch();

  const { data, isLoading } = useQuery({
    queryKey: ["operationalMeetings", status, selectedBranchId],
    queryFn: async () => {
      const q = { ...(status === "all" ? {} : { status }), ...(selectedBranchId ? { branch_id: selectedBranchId } : {}) };
      return (await base44.entities.OperationalMeeting.filter(q, { sort: "-meeting_date", limit: 100 })).items;
    },
  });
  const del = useMutation({
    mutationFn: (m) => base44.entities.OperationalMeeting.delete(m.id),
    onSuccess: () => { toast.success("Meeting deleted"); qc.invalidateQueries({ queryKey: ["operationalMeetings"] }); },
    onError: (e) => toast.error(e?.message || "Could not delete"),
  });
  const meetings = data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Operational Meetings</h2>
          <p className="text-sm text-slate-500">Schedule, log and audit meetings that address delay root causes</p>
        </div>
        {canEdit && <Button onClick={() => setEditing({})}><Plus className="w-4 h-4 mr-1" /> Schedule meeting</Button>}
      </div>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All meetings</SelectItem>
          <SelectItem value="scheduled">Scheduled</SelectItem>
          <SelectItem value="held">Held</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? <p className="text-sm text-slate-500">Loading…</p>
        : meetings.length === 0 ? <p className="text-sm text-slate-500 border rounded-lg bg-white p-6 text-center">No meetings found.</p>
        : (
          <div className="space-y-2">
            {meetings.map((m) => {
              const actions = m.actions || [];
              const overdue = actions.filter((a) => a.status !== "done" && a.due_date && a.due_date < today()).length;
              const done = actions.filter((a) => a.status === "done").length;
              const present = (m.attendees || []).filter((a) => a.present).length;
              return (
                <div key={m.id} className="border rounded-lg bg-white p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_COLOR[m.status]}>{m.status}</Badge>
                      <span className="font-medium">{m.title}</span>
                      <span className="text-xs text-slate-500">{m.meeting_date} {m.meeting_time}</span>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(m)}><Pencil className="w-4 h-4" /></Button>
                        {canEdit && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => window.confirm("Delete this meeting?") && del.mutate(m)}><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    )}
                  </div>
                  {m.agenda && <p className="text-sm text-slate-600 whitespace-pre-wrap">{m.agenda}</p>}
                  {m.root_causes && <p className="text-sm"><span className="font-semibold">Root causes: </span>{m.root_causes}</p>}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{present}/{(m.attendees || []).length} attended</span>
                    <span>Actions: {done}/{actions.length} done</span>
                    {overdue > 0 && <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="w-3 h-3" />{overdue} overdue</span>}
                  </div>
                  {actions.length > 0 && (
                    <ul className="text-sm space-y-1 border-t pt-2">
                      {actions.map((a) => (
                        <li key={a.id} className="flex flex-wrap justify-between gap-2">
                          <span className={a.status === "done" ? "line-through text-slate-400" : ""}>{a.description}</span>
                          <span className="text-xs text-slate-500">{a.owner_name || "Unassigned"} · due {a.due_date || "—"} · {a.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      {editing && <MeetingForm meeting={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  );
}