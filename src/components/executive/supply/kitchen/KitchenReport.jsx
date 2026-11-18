import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import { financeState, useExecutiveSupply } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import KpiGrid from "../KpiGrid";
import PeriodLine from "../PeriodLine";
import LedgerCheckCard from "../LedgerCheckCard";
import KitchenNotices from "./KitchenNotices";
import RecipeTable from "./RecipeTable";
import ChefTable from "./ChefTable";
import OpenBatchesCard from "./OpenBatchesCard";
import { KPIS, PURPOSE_CARD, LEDGER_CARD } from "./kitchenConfig";

const points = (trend, unit) => trend.map((t) => ({ label: bucketLabel(t.from, unit), current: t.current, previous: t.previous }));

// Kitchen Performance: how the period's production batches ran and what they cost, and the batches still open today.
export default function KitchenReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveSupply("kitchen", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, labels = { currentLabel: d.period.label, compareLabel: d.comparison.label };
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      <KitchenNotices data={d} />
      <KpiGrid kpis={KPIS} data={d} missing="No batches finished in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Batches finished by ${d.unit}`} info={{ metric: "kitchen_batches" }}>
          <TrendChart data={points(d.trend, d.unit)} format="number" {...labels} />
        </ReportCard>
        <SplitCard {...PURPOSE_CARD} parts={d.purposes} currency={cur} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ReportCard title={`Ready on time by ${d.unit}`} info={{ metric: "kitchen_on_time_rate" }}>
          <TrendChart data={points(d.on_time_trend, d.unit)} format="percent" {...labels} />
        </ReportCard>
        <LedgerCheckCard {...LEDGER_CARD} label={d.ledger.since ? `Batch cost since ${d.ledger.since}` : LEDGER_CARD.label} when={d.period.label} ledger={d.ledger} currency={cur} />
      </div>
      <RecipeTable rows={d.by_recipe} currency={cur} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ChefTable rows={d.by_chef} unassigned={d.unassigned} />
        <OpenBatchesCard open={d.open} />
      </div>
    </div>
  );
}