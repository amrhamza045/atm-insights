import { ResponsiveContainer, LineChart, Line } from "recharts";
import { BRAND } from "./chartTheme";

// A small trend line without axes, for KPI cards. values: numbers (null = gap).
export default function Sparkline({ values, color = BRAND.gold }) {
  const data = values.map((value) => ({ value }));
  return (
    <div className="h-8 -mx-1" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}