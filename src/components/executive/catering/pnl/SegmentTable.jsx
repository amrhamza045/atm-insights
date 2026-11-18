import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";
import { changeOf, changeText, changeTone } from "@/components/executive/kit/change";

const PNL = [["events_delivered", "Events", "number"], ["event_revenue", "Revenue", "money"], ["event_margin", "Margin", "money"], ["event_margin_pct", "Margin %", "percent"]];
const PNL_INFO = { calculation: "Delivered events grouped, at final-bill revenue and recorded actual costs.", source: "Catering › delivered events." };

// Catering totals per group (event type, package, venue type, client): the top
// ten (or all on request), each figure with its change.
// columns: [key, heading, format, goodWhen = "up"].
export default function SegmentTable({ title, subtitle, rows, currency, columns = PNL, info = PNL_INFO, empty = "No delivered events." }) {
  const [all, setAll] = useState(false);
  return (
    <ReportCard title={title} subtitle={subtitle} info={info}>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-slate-500"><th className="py-2 text-left font-medium">Name</th>{columns.map(([k, l]) => <th key={k} className="py-2 pl-3 text-right font-medium">{l}</th>)}</tr></thead>
            <tbody>
              {(all ? rows : rows.slice(0, 10)).map((r) => (
                <tr key={r.key} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[14rem] truncate py-2 text-slate-700" dir="auto">{r.label}</td>
                  {columns.map(([k, , f, good = "up"]) => {
                    const c = r.previous ? changeOf(r.current[k], r.previous[k], f, good) : null, t = c && changeText(c);
                    return (
                      <td key={k} className="py-2 pl-3 text-right tabular-nums">
                        <span className="block text-navy">{fmtValue(r.current[k], f, currency)}</span>
                        {t && <span className={`block text-[11px] ${changeTone(c.better)}`}>{t}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 10 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-gold hover:underline">
          {all ? "Show the top 10" : `Show all ${rows.length}`}
        </button>
      )}
    </ReportCard>
  );
}