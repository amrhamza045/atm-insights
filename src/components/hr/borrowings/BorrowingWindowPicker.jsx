import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTimezoneOffset } from "@/components/utils/timezoneHelper";

export const policyError = (e) => e?.response?.data?.error || e?.message || "Request failed";
const fmt = (iso) => new Date(new Date(iso).getTime() + getTimezoneOffset()).toISOString().slice(0, 16).replace("T", " ");

// Replaces the free Borrow Date field: shows upcoming policy windows, the limit and the request deadline.
export default function BorrowingWindowPicker({ employeeId, value, onChange }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["borrowingOptions", employeeId],
    queryFn: () => base44.functions.invoke("employeeBorrowing", { action: "options", employee_id: employeeId }).then(r => r.data),
    enabled: !!employeeId,
  });

  if (!employeeId) return <p className="text-sm text-slate-500">Select an employee to see the available disbursement windows.</p>;
  if (isLoading) return <p className="text-sm text-slate-500">Loading policy…</p>;
  if (error) return <p className="text-sm text-red-600">{policyError(error)}</p>;

  const summary = data.salary ? (
    <div className="grid grid-cols-2 gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
      <div><p className="text-xs text-slate-500">Monthly salary</p><p className="font-semibold">EGP {data.salary.toFixed(2)}</p></div>
      <div><p className="text-xs text-slate-500">Borrowing limit ({data.policy.max_percent_of_salary}% per month)</p>
        <p className="font-semibold">EGP {(data.salary * data.policy.max_percent_of_salary / 100).toFixed(2)}</p></div>
    </div>
  ) : (
    <p className="text-sm text-red-600">No monthly salary on file for this employee — the limit cannot be calculated.</p>
  );

  if (!data.policy.enabled) {
    return (
      <div className="space-y-2">{summary}<Label>Borrow Date</Label>
        <Input type="date" value={value} onChange={e => onChange(e.target.value)} /></div>
    );
  }

  const selected = data.windows.find(w => w.date === value);
  return (
    <div className="space-y-2">
      {summary}
      <Label>Disbursement window</Label>
      <Select value={selected ? value : ""} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select a window" /></SelectTrigger>
        <SelectContent>
          {data.windows.map(w => (
            <SelectItem key={w.date} value={w.date} disabled={!w.open}>
              {w.date} · {w.percent}%{w.open ? "" : " (closed)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && (
        <div className="text-sm bg-slate-50 border rounded-lg p-3 space-y-1">
          <p>Available now: <strong>EGP {selected.allowed.toFixed(2)}</strong></p>
          <p className="text-xs text-slate-500">
            Window limit {selected.percent}% = EGP {selected.window_limit.toFixed(2)} · monthly cap {data.policy.max_percent_of_salary}% = EGP {selected.month_cap.toFixed(2)} · already advanced this month EGP {selected.used_in_month.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500">Requests accepted until {fmt(selected.cutoff_at)}</p>
        </div>
      )}
    </div>
  );
}