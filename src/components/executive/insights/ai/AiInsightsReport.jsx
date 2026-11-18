import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReportState from "@/components/executive/kit/ReportState";
import { useExecutiveInsights } from "@/components/executive/data/executiveQueries";
import useReportPeriod from "@/components/executive/period/useReportPeriod";
import { rangeLabel } from "@/components/executive/period/reportPeriod";
import InsightCard from "./InsightCard";

// AI Business Insights: runs only when asked (each run uses integration
// credits) over the dashboard's own figures for the chosen period, today's
// alerts and the 90-day outlook. Kept for this period until asked again.
export default function AiInsightsReport() {
  const { period, compare } = useReportPeriod();
  const query = useExecutiveInsights("ai", { period, compare: compare === "budget" ? "previous" : compare }, { enabled: false });
  const d = query.data, run = () => query.refetch();
  if (query.isFetching) return <ReportState state="loading" message="Reading the figures and writing insights. This can take up to a minute." />;
  if (query.isError) return <ReportState state="error" message={query.error?.message} onRetry={run} />;
  if (d?.ready === false) return <ReportState state="empty" message="Finance is adding newly posted entries to its reports. Try again in a few seconds." onRetry={run} />;
  if (!d) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-gold" />
        <p className="mt-3 text-sm text-slate-700">AI reads this period's ledger and catering figures, today's alerts and the 90-day outlook, then suggests what to act on first.</p>
        <p className="mt-1 text-xs text-slate-500">Only totals are shared, never client or staff names. Each run uses integration credits.</p>
        <Button onClick={run} className="mt-4 gap-2"><Sparkles className="h-4 w-4" />Generate insights</Button>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {d.period.label}: {rangeLabel(d.period)} <span className="text-slate-400">vs {d.comparison.label.toLowerCase()}: {rangeLabel(d.comparison)} · generated {new Date(d.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </p>
        <Button variant="outline" size="sm" onClick={run} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
      </div>
      {d.headline && <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">{d.headline}</p>}
      {d.insights.length === 0
        ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">The AI found nothing to point out for this period.</p>
        : d.insights.map((x) => <InsightCard key={x.id} insight={x} />)}
      <p className="text-xs text-slate-400">AI suggestions can be wrong. Check the figures in the linked reports before acting.</p>
    </div>
  );
}