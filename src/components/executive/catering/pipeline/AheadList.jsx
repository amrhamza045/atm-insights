import { useState } from "react";
import { Link } from "react-router-dom";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";
import { cateringUrl } from "@/components/catering/cateringTabs";

const COLS = [["guests", "Guests", "number"], ["value", "Value", "money"], ["paid", "Paid", "money"], ["balance", "Balance", "money"]];
const INFO = {
  calculation: "Every confirmed, in-progress or open event dated today or later, soonest first: its stage, quote total, what has been paid, the balance, and the staff assigned against those required (red when a confirmed event is short).",
  source: "Catering › events of the selected branches.",
};

// Every event ahead; each opens in Catering.
export default function AheadList({ events, currency }) {
  const [all, setAll] = useState(false);
  return (
    <ReportCard title="Events ahead" info={INFO}>
      {events.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No events are dated today or later.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead><tr className="border-b text-xs text-slate-500"><th className="py-2 text-left font-medium">Event</th><th className="py-2 pl-3 text-left font-medium">Stage</th>{COLS.map(([k, l]) => <th key={k} className="py-2 pl-3 text-right font-medium">{l}</th>)}<th className="py-2 pl-3 text-right font-medium">Staff</th></tr></thead>
            <tbody>
              {(all ? events : events.slice(0, 15)).map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[16rem] py-2">
                    <Link to={cateringUrl("events", e.id)} className="block truncate font-medium text-navy hover:underline" dir="auto">{e.name}</Link>
                    <span className="block truncate text-[11px] text-slate-400" dir="auto">{e.date} · {e.client} · {e.event_type}</span>
                  </td>
                  <td className="py-2 pl-3"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${e.booked ? "bg-cream text-navy" : "bg-warning-50 text-warning-800"}`}>{e.stage}</span></td>
                  {COLS.map(([k, , f]) => <td key={k} className="py-2 pl-3 text-right tabular-nums text-navy">{fmtValue(e[k], f, currency)}</td>)}
                  <td className={`py-2 pl-3 text-right tabular-nums ${e.booked && e.staff_assigned < e.staff_required ? "font-semibold text-danger-600" : "text-navy"}`}>{e.staff_required ? `${e.staff_assigned}/${e.staff_required}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {events.length > 15 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-semibold text-navy hover:underline">{all ? "Show fewer" : `Show all ${events.length}`}</button>}
    </ReportCard>
  );
}