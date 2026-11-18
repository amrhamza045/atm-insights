import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function ReferralGrowthChart({ clients }) {
  const chartData = useMemo(() => {
    const referred = clients.filter(c => c.referred_by && c.referred_by !== "none");
    const byMonth = {};

    referred.forEach(c => {
      if (!c.created_date) return;
      const d = new Date(c.created_date);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    if (Object.keys(byMonth).length === 0) return [];

    const sorted = Object.keys(byMonth).sort();
    const first = sorted[0].split("-").map(Number);
    const last = sorted[sorted.length - 1].split("-").map(Number);

    const result = [];
    let y = first[0];
    let m = first[1] - 1;

    while (y < last[0] || (y === last[0] && m <= last[1] - 1)) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      result.push({
        month: `${MONTH_NAMES[m]} ${String(y).slice(2)}`,
        referrals: byMonth[key] || 0,
      });
      m++;
      if (m > 11) { m = 0; y++; }
    }

    return result;
  }, [clients]);

  const total = chartData.reduce((sum, d) => sum + d.referrals, 0);
  const peak = chartData.reduce((max, d) => Math.max(max, d.referrals), 0);

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Monthly Referral Growth
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            New referrals added each month
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-lg font-bold text-slate-900">{total}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Peak</p>
            <p className="text-lg font-bold text-amber-600">{peak}</p>
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          No referral data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              interval={chartData.length > 12 ? Math.floor(chartData.length / 12) : 0}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                fontSize: "13px",
              }}
              cursor={{ fill: "#fef3c7" }}
            />
            <Bar
              dataKey="referrals"
              fill="#f59e0b"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}