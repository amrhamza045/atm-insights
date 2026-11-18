import { useState } from "react";
import { Link } from "react-router-dom";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";

const COLS = [["guests", "Guests", "number"], ["revenue", "Revenue", "money"], ["food", "Food", "money"], ["labour", "Labour", "money"], ["cost", "Costs", "money"], ["margin", "Margin", "money"], ["margin_pct", "Margin %", "percent"], ["target_pct", "Target", "percent"]];

// Every delivered event; each opens its walkthrough in Loss Analysis.
export default function EventList({ events, currency }) {
  const [all, setAll] = useState(false);
  return (
    <ReportCard title="Every event" info={{ title: "Every event", calculation: "Each delivered event's final bill, recorded costs and margin against its target margin.", source: "Catering › delivered events." }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead><tr className="border-b text-xs text-slate-500"><th className="py-2 text-left font-medium">Event</th>{COLS.map(([k, l]) => <th key={k} className="py-2 pl-3 text-right font-medium">{l}</th>)}</tr></thead>
          <tbody>
            {(all ? events : events.slice(0, 15)).map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className="max-w-[16rem] py-2">
                  <Link to={`/ExecutiveDashboard?tab=lossanalysis&loss_event_id=${e.id}`} className="block truncate font-medium text-navy hover:underline" dir="auto">{e.name}</Link>
                  <span className="block truncate text-[11px] text-slate-400">{e.date} · {e.client} · {e.event_type}</span>
                </td>
                {COLS.map(([k, , f]) => <td key={k} className={`py-2 pl-3 text-right tabular-nums ${k === "margin" && e.margin < 0 ? "text-danger-600" : "text-navy"}`}>{fmtValue(e[k], f, currency)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {events.length > 15 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-semibold text-navy hover:underline">{all ? "Show fewer" : `Show all ${events.length}`}</button>}
    </ReportCard>
  );
}