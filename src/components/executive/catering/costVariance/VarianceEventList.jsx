import { useState } from "react";
import { Link } from "react-router-dom";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";

const COLS = [["guests", "Guests", "number"], ["planned", "Planned", "money"], ["actual", "Actual", "money"], ["over", "vs estimate", "money"], ["over_pct", "vs estimate %", "percent"]];
const INFO = {
  calculation: "Each event with complete actual costs: guests, planned and actual cost, the cost over estimate (actual less planned; above zero is an overspend) and the cost per guest, planned → actual. Biggest overspend first; open one to walk through it in Loss Analysis.",
  source: "Catering › delivered events with complete actual costs.",
};
const tone = (k, v) => (k === "over" || k === "over_pct") && v != null ? (v > 0.5 ? "text-danger-700" : v < -0.5 ? "text-success-700" : "text-navy") : "text-navy";
const perGuest = (v, guests, cur) => (guests > 0 ? fmtValue(v / guests, "money", cur) : "—");

// Every compared event, biggest overspend first.
export default function VarianceEventList({ events, currency }) {
  const [all, setAll] = useState(false);
  return (
    <ReportCard title="Events by cost variance" info={INFO}>
      {events.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No events with complete actual costs.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead><tr className="border-b text-xs text-slate-500"><th className="py-2 text-left font-medium">Event</th>{COLS.map(([k, l]) => <th key={k} className="py-2 pl-3 text-right font-medium">{l}</th>)}<th className="py-2 pl-3 text-right font-medium">Per guest</th></tr></thead>
            <tbody>
              {(all ? events : events.slice(0, 15)).map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[16rem] py-2">
                    <Link to={`/ExecutiveDashboard?tab=lossanalysis&loss_event_id=${e.id}`} className="block truncate font-medium text-navy hover:text-gold hover:underline" dir="auto">{e.name}</Link>
                    <span className="block truncate text-[11px] text-slate-400" dir="auto">{e.date} · {e.event_type} · {e.package_name}</span>
                  </td>
                  {COLS.map(([k, , f]) => <td key={k} className={`py-2 pl-3 text-right tabular-nums ${tone(k, e[k])}`}>{fmtValue(e[k], f, currency)}</td>)}
                  <td className="py-2 pl-3 text-right tabular-nums text-slate-600">{perGuest(e.planned, e.guests, currency)} → {perGuest(e.actual, e.guests, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {events.length > 15 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-gold hover:underline">{all ? "Show the top 15" : `Show all ${events.length}`}</button>
      )}
    </ReportCard>
  );
}