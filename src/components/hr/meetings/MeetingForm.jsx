import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import MeetingActionsEditor from "./MeetingActionsEditor";
import { useBranch } from "@/components/branches/BranchContext";

const blank = () => ({
  title: "", meeting_date: new Date().toISOString().slice(0, 10), meeting_time: "", status: "scheduled",
  agenda: "", notes: "", root_causes: "", attendees: [], actions: [],
});

export default function MeetingForm({ meeting, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => (meeting ? { ...blank(), ...meeting } : blank()));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // New meetings belong to the branch picked at the top; saved ones keep their own.
  const { selectedBranch, selectedBranchId } = useBranch();
  const branchId = form.branch_id || selectedBranchId;
  const branchName = form.branch_id ? form.branch_name : selectedBranch?.name;

  const { data: employees = [] } = useQuery({
    queryKey: ["meetingEmployees", branchId],
    queryFn: async () => (await base44.entities.Employee.filter({ status: "active", ...(branchId ? { branch_id: branchId } : {}) }, { sort: "name", limit: 500 })).items,
  });

  const toggleAttendee = (emp, on) => {
    const rest = form.attendees.filter((a) => a.employee_id !== emp.id);
    set("attendees", on ? [...rest, { employee_id: emp.id, name: emp.name, present: true }] : rest);
  };
  const setPresent = (id, present) => set("attendees", form.attendees.map((a) => (a.employee_id === id ? { ...a, present } : a)));

  const save = useMutation({
    mutationFn: async () => {
      const me = await base44.auth.me();
      const data = {
        title: form.title, meeting_date: form.meeting_date, meeting_time: form.meeting_time, status: form.status,
        agenda: form.agenda, notes: form.notes, root_causes: form.root_causes,
        attendees: form.attendees, actions: form.actions.filter((a) => a.description.trim()),
        branch_id: branchId, branch_name: branchName,
      };
      return meeting?.id
        ? base44.entities.OperationalMeeting.update(meeting.id, data)
        : base44.entities.OperationalMeeting.create({ ...data, recorded_by: me.email });
    },
    onSuccess: () => { toast.success("Meeting saved"); qc.invalidateQueries({ queryKey: ["operationalMeetings"] }); onClose(); },
    onError: (e) => toast.error(e?.message || "Could not save the meeting"),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{meeting?.id ? "Edit" : "Schedule"} operational meeting</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={form.meeting_date} onChange={(e) => set("meeting_date", e.target.value)} /></div>
            <div><Label>Time</Label><Input type="time" value={form.meeting_time} onChange={(e) => set("meeting_time", e.target.value)} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="held">Held</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Agenda</Label><Textarea rows={3} value={form.agenda} onChange={(e) => set("agenda", e.target.value)} /></div>
          <div>
            <Label>Attendance</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-44 overflow-y-auto border rounded-lg p-2 mt-1">
              {employees.map((e) => {
                const att = form.attendees.find((a) => a.employee_id === e.id);
                return (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2"><Checkbox checked={!!att} onCheckedChange={(v) => toggleAttendee(e, !!v)} />{e.name}</label>
                    {att && (
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <Checkbox checked={att.present} onCheckedChange={(v) => setPresent(e.id, !!v)} /> attended
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div><Label>Discussion notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          <div><Label>Delay root causes</Label><Textarea rows={3} value={form.root_causes} onChange={(e) => set("root_causes", e.target.value)} /></div>
          <div><Label>Follow-up actions</Label><MeetingActionsEditor actions={form.actions} employees={employees} onChange={(a) => set("actions", a)} /></div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={!form.title.trim() || !form.meeting_date || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save meeting"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}