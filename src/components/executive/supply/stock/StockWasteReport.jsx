import ReportCard from "@/components/executive/kit/ReportCard";
import ReportState from "@/components/executive/kit/ReportState";
import ReportNotice from "@/components/executive/kit/ReportNotice";
import TrendChart from "@/components/executive/kit/TrendChart";
import SplitCard from "@/components/executive/kit/SplitCard";
import RankedTable from "@/components/executive/kit/RankedTable";
import { fmtMoney } from "@/components/executive/kit/formatters";
import { financeState, useExecutiveSupply } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { bucketLabel } from "@/components/executive/period/reportPeriod";
import SegmentTable from "@/components/executive/catering/pnl/SegmentTable";
import KpiGrid from "../KpiGrid";
import PeriodLine from "../PeriodLine";
import LedgerCheckCard from "../LedgerCheckCard";
import WatchListCard from "./WatchListCard";
import { KPIS, REASON_CARD, ITEM_TABLE, CATEGORY_TABLE, STOCK_CATEGORY_INFO, LEDGER_CARD } from "./stockConfig";

// Stock & Waste: what the stock is worth and needs attention today, and the period's waste.
export default function StockWasteReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveSupply("stock", { period, compare: compare === "budget" ? "previous" : compare });
  const state = financeState(query);
  if (state) return <ReportState state={state} message={query.error?.message} onRetry={state === "error" ? query.refetch : undefined} />;
  const d = query.data, cur = d.currency;
  return (
    <div className="space-y-5">
      <PeriodLine data={d} />
      {d.uncosted > 0 && <ReportNotice>{d.uncosted} stock item(s) on hand can't be valued because their unit can't be converted to the unit their cost is kept in. They're left out of the stock value; add the conversion in Admin › Settings › Unit Conversions.</ReportNotice>}
      {d.pending_waste.count > 0 && <ReportNotice>{d.pending_waste.count} waste declaration(s) worth {fmtMoney(d.pending_waste.value, cur)} are waiting for approval and aren't counted yet.</ReportNotice>}
      <KpiGrid kpis={KPIS} data={d} missing="No waste or purchases in the comparison period" />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <ReportCard className="lg:col-span-2" title={`Waste cost by ${d.unit}`} info={{ metric: "waste_value" }}>
          <TrendChart data={d.trend.map((t) => ({ label: bucketLabel(t.from, d.unit), current: t.current, previous: t.previous }))} currency={cur} currentLabel={d.period.label} compareLabel={d.comparison.label} />
        </ReportCard>
        <SplitCard {...REASON_CARD} parts={d.reasons} currency={cur} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SegmentTable title="Waste by item" rows={d.by_item} currency={cur} {...ITEM_TABLE} />
        <SegmentTable title="Waste by category" rows={d.by_category} currency={cur} {...CATEGORY_TABLE} />
        <RankedTable title="Stock value by category" note={`As of today · ${d.items_in_stock} items in stock`} info={STOCK_CATEGORY_INFO} rows={d.stock_by_category} comparison={d.comparison} currency={cur} goodWhen="none" />
        <LedgerCheckCard {...LEDGER_CARD} ledger={d.ledger} currency={cur} />
      </div>
      <WatchListCard watch={d.watch} currency={cur} />
    </div>
  );
}