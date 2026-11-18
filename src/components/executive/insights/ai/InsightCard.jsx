import { Link, useSearchParams } from "react-router-dom";
import ReportCard from "@/components/executive/kit/ReportCard";
import useScreenTabs from "@/hooks/useScreenTabs";
import { REPORT_PAGES } from "@/components/executive/reportCatalog";
import { PRIORITIES } from "@/components/executive/catering/advisor/advisorChecks";

const REPORTS = Object.fromEntries(REPORT_PAGES.flatMap((p) => p.reports).map((r) => [r.value, r.label]));

// One AI insight: the finding, the action, and the report holding the detail.
export default function InsightCard({ insight: x }) {
  const [params] = useSearchParams();
  const { isOpen } = useScreenTabs("ExecutiveDashboard");
  const [, label, tone] = PRIORITIES.find(([key]) => key === x.priority) || PRIORITIES[1];
  const link = new URLSearchParams({ tab: x.report || "" });
  ["period", "compare"].forEach((k) => params.get(k) && link.set(k, params.get(k)));
  return (
    <ReportCard
      title={x.title}
      actions={<span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>{label}{x.area ? ` · ${x.area}` : ""}</span>}
    >
      <p className="text-sm text-slate-700">{x.finding}</p>
      <p className="mt-1.5 text-sm text-slate-700"><span className="font-medium text-navy">What to do: </span>{x.action}</p>
      {x.report && REPORTS[x.report] && isOpen(x.report) && (
        <Link to={`/ExecutiveDashboard?${link}`} className="mt-3 inline-block text-xs font-semibold text-navy hover:underline">Open {REPORTS[x.report]} →</Link>
      )}
    </ReportCard>
  );
}