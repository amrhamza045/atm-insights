import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { AXIS, BRAND, GRID, TOOLTIP } from "./chartTheme";
import { fmtShort, fmtValue } from "./formatters";

// A figure across the period as a navy area, with the comparison as a dashed
// gold line at the matching day or month. data: [{ label, current, previous }].
export default function TrendChart({ data, format = "money", currency, currentLabel, compareLabel, height = 260 }) {
  const compared = data.some((d) => d.previous != null);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="label" {...AXIS} minTickGap={16} />
        <YAxis {...AXIS} width={56} {...(format === "rating" && { domain: [1, 5] })} tickFormatter={(v) => (format === "percent" ? `${v}%` : format === "rating" ? v.toFixed(1) : fmtShort(v))} />
        <Tooltip {...TOOLTIP} formatter={(v, name) => [fmtValue(v, format, currency), name]} />
        {compared && <Legend wrapperStyle={{ fontSize: 12 }} />}
        <Area type="monotone" dataKey="current" name={currentLabel} stroke={BRAND.navy} fill={BRAND.navy} fillOpacity={0.08} strokeWidth={2} dot={false} connectNulls />
        {compared && <Line type="monotone" dataKey="previous" name={compareLabel} stroke={BRAND.gold} strokeDasharray="5 4" strokeWidth={2} dot={false} connectNulls />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}