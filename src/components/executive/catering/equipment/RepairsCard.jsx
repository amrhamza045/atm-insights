import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";

const INFO = {
  calculation: "Damage recorded against the period's events at check-in: the item, how many pieces, the repair cost of the record (for the whole record, not per piece) and whether the repair is done. Open repairs first.",
  source: "Catering › equipment damage records of the period's events.",
};
const STATUS = { open: ["Open", "bg-danger-50 text-danger-700"], in_progress: ["Being repaired", "bg-warning-50 text-warning-800"], resolved: ["Repaired", "bg-success-50 text-success-700"] };

// The damage recorded on the period's events.
export default function RepairsCard({ repairs, currency }) {
  const [all, setAll] = useState(false);
  return (
    <ReportCard title="Damage on the period's events" info={INFO}>
      {repairs.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No damage was recorded on the period's events.</p> : (
        <ul className="divide-y divide-slate-100">
          {(all ? repairs : repairs.slice(0, 8)).map((r) => {
            const [label, tone] = STATUS[r.status] || STATUS.open;
            return (
              <li key={r.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy" dir="auto">{r.name}{r.unit_code ? ` (${r.unit_code})` : ""}</p>
                  <p className="truncate text-[11px] text-slate-400" dir="auto">{r.date} · {r.event_name} · {r.quantity} {r.quantity === 1 ? "piece" : "pieces"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular-nums text-navy">{fmtValue(r.cost, "money", currency)}</p>
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${tone}`}>{label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {repairs.length > 8 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-gold hover:underline">{all ? "Show fewer" : `Show all ${repairs.length}`}</button>}
    </ReportCard>
  );
}