import { fmtValue } from "./formatters";

// How one total becomes another, step by step (e.g. revenue → net profit).
// steps: [{ label, value, total }]. A total is drawn from zero in navy; a step
// moves the running amount, green when it adds and red when it takes away.
// With costs, a step that adds is drawn red and one that takes away green.
export default function Waterfall({ steps, format = "money", currency, costs = false }) {
  let running = 0;
  const rows = steps.map((s) => {
    const start = s.total ? 0 : running, end = s.total ? s.value : running + s.value;
    running = end;
    return { ...s, low: Math.min(start, end), high: Math.max(start, end) };
  });
  const lo = Math.min(0, ...rows.map((r) => r.low)), hi = Math.max(0, ...rows.map((r) => r.high));
  const pos = (v) => ((v - lo) / (hi - lo || 1)) * 100;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const hurts = costs ? r.value > 0 : r.value < 0;
        const tone = r.total ? (r.value < 0 ? "bg-danger-600" : "bg-navy") : hurts ? "bg-danger-500" : "bg-success-500";
        const text = r.total ? "font-semibold text-navy" : hurts ? "text-danger-700" : "text-success-700";
        return (
          <li key={r.label} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3 text-xs">
            <span className={`truncate ${r.total ? "font-semibold text-navy" : "text-slate-600"}`}>{r.label}</span>
            <div className="relative h-5 rounded bg-slate-50">
              {lo < 0 && <div className="absolute inset-y-0 w-px bg-slate-300" style={{ left: `${pos(0)}%` }} />}
              <div className={`absolute inset-y-0.5 rounded-sm ${tone}`} style={{ left: `${pos(r.low)}%`, width: `${Math.max(pos(r.high) - pos(r.low), 0.5)}%` }} />
            </div>
            <span className={`tabular-nums text-right ${text}`}>{fmtValue(r.value, format, currency)}</span>
          </li>
        );
      })}
    </ul>
  );
}