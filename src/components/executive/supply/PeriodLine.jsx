import { rangeLabel } from "@/components/executive/period/reportPeriod";

// The period a report covers and the one it compares with.
export default function PeriodLine({ data }) {
  return (
    <p className="text-sm text-slate-600">
      {data.period.label}: {rangeLabel(data.period)} <span className="text-slate-400">vs {data.comparison.label.toLowerCase()}: {rangeLabel(data.comparison)}</span>
    </p>
  );
}