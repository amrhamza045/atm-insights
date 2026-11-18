import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";

const SHARES = [
  { key: "att_due", label: "Due", format: "number" },
  { key: "att_show_rate", label: "Showed up", format: "percent" },
  { key: "att_on_time_rate", label: "On time", format: "percent" },
  { key: "att_dependability", label: "Dependable", format: "percent" },
];
const SLIPS = [
  { key: "att_late", label: "Late", format: "number" },
  { key: "att_late_minutes", label: "Avg min late", format: "number" },
  { key: "att_left_early", label: "Left early", format: "number" },
];
const TIME = [
  { key: "att_absences", label: "Absences", format: "number" },
  { key: "att_hours", label: "Hours", format: "hours" },
  { key: "att_overtime_hours", label: "Overtime", format: "hours" },
];
const PERSON = { key: "name", label: "Person", render: (r) => <><span className="block truncate" dir="auto">{r.name}</span><span className="block truncate text-[11px] text-slate-400" dir="auto">{r.department}</span></> };

// Attendance per department, or per person (with lateness) for HR viewers.
export default function AttendanceTable({ title, info, rows, person = false }) {
  const columns = person
    ? [PERSON, ...SHARES, ...SLIPS, ...TIME]
    : [{ key: "name", label: "Department" }, { key: "people", label: "People", format: "number" }, ...SHARES, ...TIME];
  return (
    <ReportCard title={title} info={info}>
      <ListTable rows={rows} columns={columns} empty="No clock-ins were recorded in the period." />
    </ReportCard>
  );
}