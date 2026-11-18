import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, PoundSterling, Users, AlertTriangle, Wallet, Clock } from "lucide-react";
import { useMemo } from "react";

function StatCard({ icon: Icon, label, value, sub, color = "text-slate-900" }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2 rounded-lg bg-slate-100">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PayrollDashboard() {
  // Build last 6 months array
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      result.push({ key, label });
    }
    return result;
  }, []);

  const { selectedBranchId } = useBranch();
  const branch = selectedBranchId ? { branch_id: selectedBranchId } : {};
  const firstMonthKey = months[0].key;
  const currentMonthKey = months[months.length - 1].key;

  // Monthly totals of the picked branch, added up on the server
  const { data: totals = [], isLoading } = useQuery({
    queryKey: ["salaryRecords-6mo", selectedBranchId, firstMonthKey],
    queryFn: async () => (await base44.entities.SalaryRecord.aggregate({
      query: { month: { $gte: firstMonthKey }, ...branch },
      groupBy: "month",
      sum: ["gross_salary", "net_salary", "penalty_deductions", "borrowing_deductions", "overtime_earnings", "overtime_hours", "deductions"],
    })).rows
  });

  // Top 5 net salaries of the current month
  const { data: topEarners = [] } = useQuery({
    queryKey: ["salaryRecords-top", selectedBranchId, currentMonthKey],
    queryFn: async () => (await base44.entities.SalaryRecord.filter({ month: currentMonthKey, ...branch }, { sort: "-net_salary", limit: 5 })).items
  });

  // Active staff of the branch (system accounts are not staff)
  const { data: activeCount = 0 } = useQuery({
    queryKey: ["employees-active-count", selectedBranchId],
    queryFn: () => base44.entities.Employee.count({ status: "active", employment_type: { $ne: "system_account" }, ...branch })
  });

  const monthlyData = useMemo(() => months.map(({ key, label }) => {
    const r = totals.find((t) => t.month === key) || {};
    const penalties = r.sum_penalty_deductions || 0;
    const borrowings = r.sum_borrowing_deductions || 0;
    return {
      label,
      grossTotal: r.sum_gross_salary || 0,
      netTotal: r.sum_net_salary || 0,
      penalties,
      borrowings,
      overtime: r.sum_overtime_earnings || 0,
      overtimeHours: r.sum_overtime_hours || 0,
      totalDeductions: penalties + borrowings + (r.sum_deductions || 0),
      headcount: r.count || 0,
    };
  }), [totals, months]);

  // Current month stats (latest)
  const currentMonthData = monthlyData[monthlyData.length - 1] || {};
  const prevMonthData = monthlyData[monthlyData.length - 2] || {};
  const netTrend = currentMonthData.netTotal - (prevMonthData.netTotal || 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={PoundSterling} label="Net Payroll (This Month)" value={`EGP ${(currentMonthData.netTotal || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} color="text-green-600" />
        <StatCard icon={TrendingUp} label="vs Last Month" value={`${netTrend >= 0 ? "+" : ""}EGP ${netTrend.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} color={netTrend >= 0 ? "text-blue-600" : "text-red-600"} />
        <StatCard icon={Clock} label="Overtime (This Month)" value={`EGP ${(currentMonthData.overtime || 0).toFixed(0)}`} sub={`${(currentMonthData.overtimeHours || 0).toFixed(1)}h`} color="text-warning-600" />
        <StatCard icon={AlertTriangle} label="Penalty Deductions" value={`EGP ${(currentMonthData.penalties || 0).toFixed(0)}`} color="text-red-600" />
        <StatCard icon={Wallet} label="Borrowing Deductions" value={`EGP ${(currentMonthData.borrowings || 0).toFixed(0)}`} color="text-purple-600" />
        <StatCard icon={Users} label="Headcount" value={currentMonthData.headcount || 0} sub={`${activeCount} active`} />
      </div>

      {/* Gross vs Net Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gross vs Net Payroll — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `EGP ${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="grossTotal" name="Gross" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netTotal" name="Net" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Deductions Trend */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Deductions Breakdown — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `EGP ${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="penalties" name="Penalties" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="borrowings" name="Borrowings" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overtime Earnings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}`} />
                <Tooltip formatter={(v, name) => name === "overtimeHours" ? `${v.toFixed(1)}h` : `EGP ${v.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="overtime" name="OT Earnings (EGP)" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="overtimeHours" name="OT Hours" stroke="#fb923c" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Current Month Employee Table */}
      {topEarners.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Earners — {months[months.length - 1]?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-xs">
                    <th className="text-left py-2 font-medium">Employee</th>
                    <th className="text-right py-2 font-medium">Gross</th>
                    <th className="text-right py-2 font-medium">OT Earnings</th>
                    <th className="text-right py-2 font-medium">Deductions</th>
                    <th className="text-right py-2 font-medium">Net</th>
                    <th className="text-right py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topEarners.map(rec => {
                    const totalDed = (rec.penalty_deductions || 0) + (rec.borrowing_deductions || 0) + (rec.deductions || 0);
                    return (
                      <tr key={rec.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 font-medium">{rec.employee_name}</td>
                        <td className="py-2 text-right text-slate-600">EGP {(rec.gross_salary || 0).toFixed(0)}</td>
                        <td className="py-2 text-right text-warning-600">+EGP {(rec.overtime_earnings || 0).toFixed(0)}</td>
                        <td className="py-2 text-right text-red-600">{totalDed > 0 ? `-EGP ${totalDed.toFixed(0)}` : "—"}</td>
                        <td className="py-2 text-right font-bold text-teal-700">EGP {(rec.net_salary || 0).toFixed(0)}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rec.payment_status === "paid" ? "bg-green-100 text-green-700" : rec.payment_status === "partial" ? "bg-warning-100 text-warning-700" : "bg-slate-100 text-slate-600"}`}>
                            {rec.payment_status || "pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}