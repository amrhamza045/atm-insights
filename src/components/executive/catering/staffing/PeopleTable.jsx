import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";

const COLS = [["events", "Events", "number"], ["planned_hours", "Planned hours", "number"], ["planned_cost", "Planned cost", "money"]];
const INFO = {
  calculation: "Everyone on the period's shifts, most events first: their main role, the hours and cost planned on their assignments, and the average 1–5 rating they were given.",
  source: "Catering › confirmed staff assignments and staff feedback on the period's events.",
};

// The people who worked the period's events.
export default function PeopleTable({ people, currency }) {
  const [all, setAll] = useState(false);
  return (
    <ReportCard title="People" info={INFO}>
      {people.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No staff shifts.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr className="border-b text-xs text-slate-500"><th className="py-2 text-left font-medium">Person</th>{COLS.map(([k, l]) => <th key={k} className="py-2 pl-3 text-right font-medium">{l}</th>)}<th className="py-2 pl-3 text-right font-medium">Rating</th></tr></thead>
            <tbody>
              {(all ? people : people.slice(0, 15)).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[16rem] py-2"><span className="block truncate font-medium text-navy" dir="auto">{p.name}</span><span className="block truncate text-[11px] text-slate-400" dir="auto">{p.type} · {p.role}</span></td>
                  {COLS.map(([k, , f]) => <td key={k} className="py-2 pl-3 text-right tabular-nums text-navy">{fmtValue(p[k], f, currency)}</td>)}
                  <td className="py-2 pl-3 text-right tabular-nums text-navy">{fmtValue(p.rating, "rating")}{p.ratings > 0 && <span className="block text-[11px] text-slate-400">{p.ratings} ratings</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {people.length > 15 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-navy underline-offset-2 hover:underline">{all ? "Show fewer" : `Show all ${people.length}`}</button>}
    </ReportCard>
  );
}