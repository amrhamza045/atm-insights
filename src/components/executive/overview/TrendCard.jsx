import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import TrendChart from "@/components/executive/kit/TrendChart";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";

const OPTIONS = ["revenue", "gross_profit", "net_profit"];

// One ledger figure per day or month of the period, with the comparison line.
export default function TrendCard({ data, className }) {
  const [metric, setMetric] = useState("revenue");
  const rows = data.trend.map((t) => ({ label: bucketLabel(t.from, data.unit), current: t.current[metric], previous: t.previous?.[metric] ?? null }));
  const toggle = (
    <div role="group" aria-label="Figure shown" className="inline-flex rounded-lg border border-slate-200 p-0.5">
      {OPTIONS.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={metric === key}
          onClick={() => setMetric(key)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${metric === key ? "bg-navy text-white" : "text-slate-600 hover:bg-cream"}`}
        >
          {METRICS[key].label}
        </button>
      ))}
    </div>
  );
  return (
    <ReportCard
      title={`${METRICS[metric].label} by ${data.unit}`}
      info={{ metric, note: "The comparison line sits each day or month next to the matching day or month of the comparison period." }}
      actions={toggle}
      className={className}
    >
      <TrendChart data={rows} currency={data.company.currency} currentLabel={data.period.label} compareLabel={data.comparison.label} />
    </ReportCard>
  );
}