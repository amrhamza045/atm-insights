import { useState } from "react";
import ReportCard from "./ReportCard";
import InfoTip from "./InfoTip";
import RankedRow from "./RankedRow";

const head = "py-2 text-right font-medium";

// A ranked list for the period, largest first: each row's amount, its share of
// the total and, when the rows have a comparison, that and the change.
// rows: [{ key, label, detail, tag, current, previous }]. Only the first
// `limit` rows show until all are asked for.
export default function RankedTable({ title, info, note, rows, comparison, currency, goodWhen = "up", limit = 10 }) {
  const [all, setAll] = useState(false);
  const ranked = [...rows].sort((a, b) => b.current - a.current);
  const total = ranked.reduce((s, r) => s + r.current, 0), compared = ranked.some((r) => r.previous != null);
  const shown = all ? ranked : ranked.slice(0, limit);
  return (
    <ReportCard title={title} info={info} subtitle={note}>
      {ranked.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Nothing posted for this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th scope="col" className="py-2 text-left font-medium">Name</th>
                <th scope="col" className={head}>Amount</th>
                <th scope="col" className={head}>
                  <span className="inline-flex items-center gap-1">Share<InfoTip title="Share" calculation="The row's amount ÷ the total of all rows for the period × 100." source={info.source} /></span>
                </th>
                {compared && <th scope="col" className={head}>{comparison.label}</th>}
                {compared && <th scope="col" className={head}>Change</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <RankedRow key={r.key} row={r} share={total > 0 ? (r.current / total) * 100 : null} compared={compared} goodWhen={goodWhen} currency={currency} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ranked.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-navy underline underline-offset-2">
          {all ? "Show fewer" : `Show all ${ranked.length}`}
        </button>
      )}
    </ReportCard>
  );
}