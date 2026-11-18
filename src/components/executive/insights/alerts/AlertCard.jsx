import { Link } from "react-router-dom";
import ReportCard from "@/components/executive/kit/ReportCard";
import { PRIORITIES } from "@/components/executive/catering/advisor/advisorChecks";
import { ALERTS } from "./alertsConfig";

// One alert: what fired and why, what to do, the records behind it and the
// screen where it is dealt with.
export default function AlertCard({ alert: a, words }) {
  const c = ALERTS[a.key];
  if (!c) return null;
  const [, label, tone] = PRIORITIES.find(([key]) => key === a.priority);
  const title = c.title(a, words), items = a.items || [];
  return (
    <ReportCard
      title={title}
      info={{ title, calculation: c.when, source: c.source }}
      actions={<span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>{label} · {c.area}</span>}
    >
      <p className="text-sm text-slate-700">{c.why(a, words)}</p>
      <p className="mt-1.5 text-sm text-slate-700"><span className="font-medium text-navy">What to do: </span>{c.action}</p>
      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-1.5">
              {c.itemUrl
                ? <Link to={c.itemUrl(i)} className="min-w-0 truncate font-medium text-navy hover:underline" dir="auto">{i.name}</Link>
                : <span className="min-w-0 truncate font-medium text-navy" dir="auto">{i.name}</span>}
              <span className="flex-shrink-0 text-xs tabular-nums text-slate-500">{[i.date, c.detail?.(i, words)].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
          {a.count > items.length && <li className="py-1.5 text-xs text-slate-400">and {a.count - items.length} more</li>}
        </ul>
      )}
      <Link to={c.screen.url} className="mt-3 inline-block text-xs font-semibold text-navy hover:underline">Open {c.screen.label} →</Link>
    </ReportCard>
  );
}