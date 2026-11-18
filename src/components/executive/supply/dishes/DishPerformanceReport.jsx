import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import ReportNotice from "@/components/executive/kit/ReportNotice";
import TrendChart from "@/components/executive/kit/TrendChart";
import { financeState, useExecutiveSupply } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import KpiGrid from "../KpiGrid";
import PeriodLine from "../PeriodLine";
import MatrixCard from "./MatrixCard";
import DishesCard from "./DishesCard";
import FoodCostCard from "./FoodCostCard";
import { KPIS } from "./dishesConfig";

// Dish Performance: how the dishes of the period's delivered events did, and the menu's food cost today.
export default function DishPerformanceReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveSupply("dishes", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency, unquoted = d.events - d.quoted;
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      {!d.has_activity && <ReportNotice>No delivered events with menu dishes in this period.</ReportNotice>}
      {unquoted > 0 && <ReportNotice>{unquoted} delivered event(s) of the period have no active quote, so their dishes aren't counted.</ReportNotice>}
      {d.uncosted_dishes > 0 && <ReportNotice>{d.uncosted_dishes} of the period's dishes have no costed recipe, so they're left out of the cost at today's prices. Add their recipes in Menu Management.</ReportNotice>}
      <KpiGrid kpis={KPIS} data={d} missing="No delivered events in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Dish revenue by ${d.unit}`} info={{ metric: "dish_revenue" }}>
          <TrendChart data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <MatrixCard classes={d.classes} currency={cur} />
      </div>
      <DishesCard rows={d.dishes} classes={d.classes} currency={cur} />
      <FoodCostCard rows={d.menu} currency={cur} />
    </div>
  );
}