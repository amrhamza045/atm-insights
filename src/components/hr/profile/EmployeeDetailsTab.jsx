import { Mail, Phone, Briefcase, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEmployeeHistory, currentShiftOf } from "./useEmployeeHistory";

function Field({ label, value }) {
  const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  return (
    <div className="rounded-md border p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-900 mt-0.5 break-words">{empty ? "—" : Array.isArray(value) ? value.join(", ") : String(value)}</p>
    </div>
  );
}

const money = (v) => (v || v === 0 ? `EGP ${v}` : null);

export default function EmployeeDetailsTab({ employee, role }) {
  const { shifts } = useEmployeeHistory(employee.id);
  const shift = currentShiftOf(shifts.data || []);
  const shiftText = shift
    ? `${shift.start_time}–${shift.end_time}${shift.catering_event_name ? ` (${shift.catering_event_name})` : ""}`
    : "No shift today";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {employee.face_scan_data ? (
          <img src={employee.face_scan_data} alt={employee.name} className="w-20 h-20 rounded-full object-cover border" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-2xl font-semibold">
            {(employee.name || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-slate-900">{employee.name}</h3>
          <div className="flex flex-wrap gap-2 items-center text-sm text-slate-600">
            <Badge variant="secondary" className="gap-1"><Briefcase className="w-3 h-3" />{role || "No role"}</Badge>
            <Badge variant="outline">{employee.status}</Badge>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{shiftText}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            {employee.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{employee.email}</span>}
            {employee.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{employee.phone}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="Employee ID" value={employee.employee_id} />
        <Field label="Department" value={employee.department} />
        <Field label="Role" value={role} />
        <Field label="Legacy position" value={employee.position} />
        <Field label="Branch" value={employee.branch_name} />
        <Field label="Employment type" value={employee.employment_type} />
        <Field label="Status" value={employee.status} />
        <Field label="Hire date" value={employee.hire_date} />
        <Field label="Salary type" value={employee.salary_type} />
        <Field label="Hourly rate" value={money(employee.hourly_rate)} />
        <Field label="Fixed monthly salary" value={money(employee.fixed_salary)} />
        <Field label="Bonus structure" value={employee.bonus_structure} />
        <Field label="Current month earnings" value={money(employee.current_month_earnings)} />
        <Field label="Total hours worked" value={employee.total_hours_worked} />
        <Field label="Skills / certifications" value={employee.skills} />
        <Field label="Catering events worked" value={employee.catering_events_worked} />
        <Field label="Largest event (guests)" value={employee.largest_event_guests} />
        <Field label="Invite sent" value={employee.invite_sent_at ? new Date(employee.invite_sent_at).toLocaleString() : null} />
        <Field label="Face scan on file" value={employee.face_scan_data ? "Yes" : "No"} />
        <Field label="Record created" value={employee.created_date ? new Date(employee.created_date).toLocaleDateString() : null} />
      </div>
    </div>
  );
}