import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export const ACTION_STATUS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export default function MeetingActionsEditor({ actions, employees, onChange }) {
  const update = (i, patch) => onChange(actions.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const add = () => onChange([...actions, { id: crypto.randomUUID(), description: "", owner_id: "", owner_name: "", due_date: "", status: "open" }]);

  return (
    <div className="space-y-2">
      {actions.map((a, i) => (
        <div key={a.id} className="grid grid-cols-12 gap-2 items-center border rounded-lg p-2 bg-slate-50">
          <Input className="col-span-12 md:col-span-4" placeholder="Follow-up action" value={a.description} onChange={(e) => update(i, { description: e.target.value })} />
          <div className="col-span-12 md:col-span-3">
            <Select value={a.owner_id} onValueChange={(v) => update(i, { owner_id: v, owner_name: employees.find((e) => e.id === v)?.name || "" })}>
              <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input className="col-span-6 md:col-span-2" type="date" value={a.due_date} onChange={(e) => update(i, { due_date: e.target.value })} />
          <div className="col-span-5 md:col-span-2">
            <Select value={a.status} onValueChange={(v) => update(i, { status: v, completed_date: v === "done" ? new Date().toISOString().slice(0, 10) : "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTION_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="icon" variant="ghost" className="col-span-1 text-red-600" onClick={() => onChange(actions.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="w-3 h-3 mr-1" /> Add action</Button>
    </div>
  );
}