import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import ReportCard from "@/components/executive/kit/ReportCard";
import { AXIS, BRAND, GRID, TOOLTIP } from "@/components/executive/kit/chartTheme";
import { fmtShort, fmtValue } from "@/components/executive/kit/formatters";
import { bucketLabel } from "@/components/executive/period/reportPeriod";

const INFO = {
  calculation: "Quote totals of the events dated today or later, by event month: confirmed or in-progress events, and open enquiries and quotes. Events more than a year ahead show as Later.",
  source: "Catering › events of the selected branches.",
};

// The work on the books for the coming months: confirmed value with the open pipeline stacked on top.
export default function ForwardBookChart({ months, currency, className }) {
  const data = months.map((m) => ({ label: m.from ? bucketLabel(m.from, "month") : "Later", confirmed: m.confirmed, open: m.open }));
  return (
    <ReportCard className={className} title="Booked ahead by month" info={INFO}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={56} tickFormatter={(v) => fmtShort(v)} />
          <Tooltip {...TOOLTIP} formatter={(v, name) => [fmtValue(v, "money", currency), name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="confirmed" name="Confirmed" stackId="ahead" fill={BRAND.navy} />
          <Bar dataKey="open" name="Open enquiries & quotes" stackId="ahead" fill={BRAND.gold} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ReportCard>
  );
}