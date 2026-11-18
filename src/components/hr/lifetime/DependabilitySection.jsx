import { useEmployeeHistory, isoDate } from "@/components/hr/profile/useEmployeeHistory";

const DAYS = 90;

/** Share of the last 90 days' attendance records that were on time, full-length and not absent. */
export function computeDependability(records) {
  const from = new Date();
  from.setDate(from.getDate() - DAYS);
  const start = isoDate(from);
  const rows = records.filter((r) => (r.attendance_date || "").slice(0, 10) >= start);
  const absent = rows.filter((r) => ["absent", "no_show"].includes(r.status)).length;
  const attended = rows.filter((r) => !["absent", "no_show", "rejected_hr_confirmation", "pending_hr_confirmation"].includes(r.status));
  const late = attended.filter((r) => (r.late_minutes || 0) > 0).length;
  const early = attended.filter((r) => (r.early_leave_minutes || 0) > 0).length;
  const clean = attended.filter((r) => !(r.late_minutes > 0) && !(r.early_leave_minutes > 0)).length;
  const total = attended.length + absent;
  return { total, absent, late, early, score: total ? Math.round((clean / total) * 100) : null };
}

export default function DependabilitySection({ employee }) {
  const { attendance } = useEmployeeHistory(employee.id);
  const d = computeDependability(attendance.data || []);
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <h3 className="font-semibold">Attendance dependability</h3>
      {attendance.isLoading ? <p className="text-sm text-slate-500">Loading…</p>
        : d.total === 0 ? <p className="text-sm text-slate-500">No attendance in the last {DAYS} days.</p>
        : (
          <>
            <p className="text-3xl font-bold">{d.score}%</p>
            <p className="text-sm text-slate-600">{d.total} scheduled days · {d.absent} absent · {d.late} late · {d.early} left early</p>
          </>
        )}
      <p className="text-xs text-slate-500">Definition: days attended on time and for the full shift, divided by all attendance records plus absences, over the last {DAYS} days.</p>
    </div>
  );
}