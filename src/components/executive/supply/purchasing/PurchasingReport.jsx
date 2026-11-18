import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import ReportNotice from "@/components/executive/kit/ReportNotice";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import { fmtMoney } from "@/components/executive/kit/formatters";
import { financeState, useExecutiveSupply } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import KpiGrid from "../KpiGrid";
import PeriodLine from "../PeriodLine";
import PriceChangesCard from "./PriceChangesCard";
import OpenOrdersCard from "./OpenOrdersCard";
import { KPIS, SOURCE_CARD, CATEGORY_TABLE } from "./purchasingConfig";

// Purchasing: what was bought and ordered in the period, price changes, and the orders still open.
export default function PurchasingReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveSupply("purchasing", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency;
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      {!d.has_activity && <ReportNotice>No purchase invoices were posted and no purchase orders were raised in this period.</ReportNotice>}
      {d.drafts.count > 0 && <ReportNotice>{d.drafts.count} draft invoice(s) worth {fmtMoney(d.drafts.value, cur)} haven't been posted yet, so they aren't counted.</ReportNotice>}
      <KpiGrid kpis={KPIS} data={d} missing="No purchases in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Purchases by ${d.unit}`} info={{ metric: "purchases_value" }}>
          <TrendChart data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <SplitCard {...SOURCE_CARD} parts={d.sources} currency={cur} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SegmentTable title="Purchases by category" rows={d.by_category} currency={cur} {...CATEGORY_TABLE} />
        <PriceChangesCard rows={d.price_changes} comparison={d.comparison} compared={!!d.previous} currency={cur} />
      </div>
      <OpenOrdersCard open={d.open} currency={cur} />
    </div>
  );
}