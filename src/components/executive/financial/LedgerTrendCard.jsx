import ReportCard from "@/components/executive/kit/ReportCard";
import TrendChart from "@/components/executive/kit/TrendChart";
import { bucketLabel } from "@/components/executive/period/reportPeriod";

// One ledger figure per day or month of the period (data.trend), with the
// comparison as a dashed line.
export default function LedgerTrendCard({ data, title, metric, note, className }) {
  const rows = data.trend.map((t) => ({ label: bucketLabel(t.from, data.unit), current: t.current, previous: t.previous }));
  return (
    <ReportCard title={title} info={{ metric, note }} className={className}>
      <TrendChart data={rows} currency={data.company.currency} currentLabel={data.period.label} compareLabel={data.comparison.label} />
    </ReportCard>
  );
}