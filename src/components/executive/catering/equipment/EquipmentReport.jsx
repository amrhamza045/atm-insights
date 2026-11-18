import KpiCard from "@/components/executive/kit/KpiCard";
import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import { financeState, useExecutiveCatering } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel, rangeLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import RepairsCard from "./RepairsCard";
import AssetRegisterCard from "./AssetRegisterCard";
import ReturnedItemsCard from "./ReturnedItemsCard";
import { KPIS, DISPOSITION_CARD, ITEM_TABLE, CATEGORY_TABLE } from "./equipmentConfig";

// Equipment & Returns: equipment used on the period's events, what came back, and the asset register.
export default function EquipmentReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveCatering("equipment", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, vs = d.comparison.label.toLowerCase();
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">{d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {vs}: {rangeLabel(d.comparison)}</span></p>
      {!d.has_activity && <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">No equipment was booked and nothing was logged back for this period's events.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {KPIS.map((m) => <KpiCard key={m} metric={m} value={d.current[m]} previous={d.previous?.[m]} compareLabel={vs} missing="No events in the comparison period" currency={cur} />)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Pieces booked by ${d.unit}`} info={{ metric: "pieces_booked" }}>
          <TrendChart format="number" data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <SplitCard {...DISPOSITION_CARD} parts={d.dispositions} currency={cur} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SegmentTable title="By equipment item" rows={d.by_item} currency={cur} {...ITEM_TABLE} />
        <SegmentTable title="Returns by category" rows={d.by_category} currency={cur} {...CATEGORY_TABLE} />
        <RepairsCard repairs={d.repairs} currency={cur} />
        <AssetRegisterCard register={d.register} currency={cur} />
      </div>
      <ReturnedItemsCard rows={d.returns} currency={cur} />
    </div>
  );
}