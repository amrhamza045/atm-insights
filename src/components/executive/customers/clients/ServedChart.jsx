import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { AXIS, BRAND, GRID, TOOLTIP } from "@/components/executive/kit/chartTheme";
import { fmtNumber } from "@/components/executive/kit/formatters";

// Clients served per day or month: first-time (navy) and returning (gold)
// stacked, with the comparison's clients served as a dashed line.
// data: [{ label, first_time, returning, previous }].
export default function ServedChart({ data, compareLabel }) {
  const compared = data.some((d) => d.previous != null);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} minTickGap={16} />
        <YAxis {...AXIS} width={40} allowDecimals={false} />
        <Tooltip {...TOOLTIP} formatter={(v, name) => [fmtNumber(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="first_time" name="First-time" stackId="served" fill={BRAND.navy} />
        <Bar dataKey="returning" name="Returning" stackId="served" fill={BRAND.gold} radius={[3, 3, 0, 0]} />
        {compared && <Line type="monotone" dataKey="previous" name={`Served, ${compareLabel.toLowerCase()}`} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}