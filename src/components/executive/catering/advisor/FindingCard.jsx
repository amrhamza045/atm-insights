import { Link, useSearchParams } from "react-router-dom";
import ReportCard from "@/components/executive/kit/ReportCard";
import useScreenTabs from "@/hooks/useScreenTabs";
import { REPORT_PAGES } from "@/components/executive/reportCatalog";
import { cateringUrl } from "@/components/catering/cateringTabs";
import { CHECKS, PRIORITIES } from "./advisorChecks";

const REPORTS = Object.fromEntries(REPORT_PAGES.flatMap((p) => p.reports).map((r) => [r.value, r.label]));

// One Advisor finding: why it fired, what to do, the events behind it and the
// report it comes from (opened on the same period and comparison).
export default function FindingCard({ finding: f, words }) {
  const [params] = useSearchParams();
  const { isOpen } = useScreenTabs("ExecutiveDashboard");
  const check = CHECKS[f.key];
  const [, label, tone] = PRIORITIES.find(([key]) => key === f.priority);
  const title = check.title(f);
  const link = new URLSearchParams({ tab: f.report });
  ["period", "compare"].forEach((k) => params.get(k) && link.set(k, params.get(k)));
  const events = f.events || [];
  return (
    <ReportCard
      title={title}
      info={{ title, calculation: check.when, source: check.source }}
      actions={<span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>{label} · {check.area}</span>}
    >
      <p className="text-sm text-slate-700">{check.why(f, words)}</p>
      <p className="mt-1.5 text-sm text-slate-700"><span className="font-medium text-navy">What to do: </span>{check.action}</p>
      {events.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-1.5">
              <Link to={check.url ? check.url(e) : cateringUrl("events", e.id)} className="min-w-0 truncate font-medium text-navy hover:underline" dir="auto">{e.name}</Link>
              <span className="flex-shrink-0 text-xs tabular-nums text-slate-500">{e.date} · {check.detail(e, words)}</span>
            </li>
          ))}
          {f.count > events.length && <li className="py-1.5 text-xs text-slate-400">and {f.count - events.length} more</li>}
        </ul>
      )}
      {isOpen(f.report) && <Link to={`/ExecutiveDashboard?${link}`} className="mt-3 inline-block text-xs font-semibold text-navy hover:underline">Open {REPORTS[f.report]} →</Link>}
    </ReportCard>
  );
}