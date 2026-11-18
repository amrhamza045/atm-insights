import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtMoney } from "@/components/executive/kit/formatters";
import { CLASSES, MATRIX_INFO } from "./dishesConfig";

// The menu-engineering matrix of the period's dishes.
export default function MatrixCard({ classes, currency }) {
  return (
    <ReportCard title="Menu engineering" info={MATRIX_INFO}>
      {classes.every((c) => c.count === 0) ? <p className="py-6 text-center text-sm text-slate-500">No dishes were served in the period.</p> : (
        <div className="grid grid-cols-2 gap-3">
          {classes.map((c) => (
            <div key={c.key} className="min-w-0 rounded-xl border border-slate-100 p-3">
              <p className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CLASSES[c.key].tone}`}>{c.label}</span>
                <span className="text-sm font-semibold tabular-nums text-navy">{c.count}</span>
              </p>
              <p className="mt-1 text-[11px] tabular-nums text-slate-500">{fmtMoney(c.value, currency)}</p>
              <p className="mt-1 text-[11px] text-slate-400">{CLASSES[c.key].hint}</p>
              {c.dishes.map((name) => <p key={name} className="truncate text-xs text-slate-700" dir="auto">{name}</p>)}
            </div>
          ))}
        </div>
      )}
    </ReportCard>
  );
}