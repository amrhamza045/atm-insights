import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";

const INFO = {
  calculation: "Events cancelled in the period, latest first: their quote total, the penalty kept under the cancellation policy and the reason given.",
  source: "Catering › cancelled events of the selected branches, by the day each was cancelled.",
};

// The period's cancellations with what was kept and why.
export default function CancellationList({ rows, penalties, currency }) {
  const [all, setAll] = useState(false);
  return (
    <ReportCard title="Cancellations" info={INFO} subtitle={rows.length ? `Penalties kept: ${fmtValue(penalties, "money", currency)}` : undefined}>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No events were cancelled in this period.</p> : (
        <ul className="divide-y divide-slate-100">
          {(all ? rows : rows.slice(0, 8)).map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy" dir="auto">{r.name}</p>
                <p className="truncate text-[11px] text-slate-400" dir="auto">Cancelled {r.cancelled_on || "—"} · event {r.event_date} · {r.client}</p>
                {r.reason && <p className="truncate text-xs text-slate-500" dir="auto">{r.reason}</p>}
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-navy">{fmtValue(r.value, "money", currency)}</p>
                <p className="text-[11px] text-slate-400">Kept {fmtValue(r.penalty, "money", currency)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rows.length > 8 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-semibold text-navy hover:underline">{all ? "Show fewer" : `Show all ${rows.length}`}</button>}
    </ReportCard>
  );
}