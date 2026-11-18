import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";
import { SOURCE } from "./feedbackConfig";

const INFO = { calculation: "What clients said at each event's wrap-up, lowest rating first, then newest.", source: SOURCE };
const tone = (r) => (r == null ? "bg-slate-100 text-slate-600" : r >= 4 ? "bg-success-50 text-success-700" : r >= 3 ? "bg-warning-50 text-warning-800" : "bg-danger-50 text-danger-700");

// The clients' own words; null when the person may not open catering events.
export default function CommentsList({ comments }) {
  const [all, setAll] = useState(false);
  const empty = comments === null ? "Client comments need catering access." : "No client comments in this period.";
  return (
    <ReportCard title="What clients said" info={INFO}>
      {!comments?.length ? <p className="py-6 text-center text-sm text-slate-500">{empty}</p> : (
        <ul className="divide-y divide-slate-100">
          {(all ? comments : comments.slice(0, 10)).map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy" dir="auto">{c.name}</p>
                  <p className="truncate text-[11px] text-slate-400" dir="auto">{c.date} · {c.client} · {c.package_name} · {c.venue}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone(c.rating)}`}>{fmtValue(c.rating, "rating")}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700" dir="auto">“{c.comment}”</p>
            </li>
          ))}
        </ul>
      )}
      {comments?.length > 10 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-gold hover:underline">{all ? "Show fewer" : `Show all ${comments.length}`}</button>}
    </ReportCard>
  );
}