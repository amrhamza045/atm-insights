import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { companyToday } from "@/components/utils/timezoneHelper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const TYPE_LABELS = {
  late_arrival: "Late arrival", absence: "Absence", misconduct: "Misconduct",
  damage: "Damage", early_leave: "Early leave", other: "Penalty",
};

// Penalties and deductions are never pushed in real time. They appear here
// from the day after the incident (company timezone).
export default function NextDayPenaltyNotices({ employeeId }) {
  const today = companyToday();

  const { data: penalties = [] } = useQuery({
    queryKey: ["myPenaltyNotices", employeeId],
    queryFn: () => base44.entities.SalaryPenalty.filter({ employee_id: employeeId }, { sort: "-incident_date", limit: 50 }).then(r => r.items),
    enabled: !!employeeId,
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ["myDeductionNotices", employeeId],
    queryFn: () => base44.entities.Attendance.filter({ employee_id: employeeId, review_status: "approved" }, { sort: "-attendance_date", limit: 50 }).then(r => r.items),
    enabled: !!employeeId,
  });

  const notices = [
    ...penalties
      .filter(p => p.status !== "cancelled")
      .map(p => ({ id: `p${p.id}`, date: p.incident_date, title: TYPE_LABELS[p.penalty_type] || "Penalty", amount: p.amount, detail: p.description })),
    ...attendance
      .filter(a => (a.deduction_amount || 0) > 0 && !a.exception_waived)
      .map(a => ({ id: `a${a.id}`, date: a.attendance_date, title: "Attendance deduction", amount: a.deduction_amount, detail: a.deduction_breakdown })),
  ]
    .filter(n => n.date && n.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (notices.length === 0) return null;

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> Penalty & Deduction Notices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notices.map(n => (
          <div key={n.id} className="flex justify-between gap-3 border rounded-lg p-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{n.title}</p>
              <p className="text-xs text-slate-500">Incident date: {n.date}</p>
              {n.detail && <p className="text-xs text-slate-600 mt-1">{n.detail}</p>}
            </div>
            <p className="font-semibold text-red-600 whitespace-nowrap">-{(n.amount || 0).toFixed(2)} EGP</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}