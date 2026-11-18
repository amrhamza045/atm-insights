import ReportCard from "./ReportCard";
import { fmtValue } from "./formatters";

// One total split into parts, as a bar and its legend.
// parts: [{ key, label, count, value }] — value (money unless format says
// otherwise) is left out when null; tones: key → background class.
export default function SplitCard({ title, info, parts, tones, currency, empty, format = "money" }) {
  const total = parts.reduce((s, p) => s + p.count, 0);
  return (
    <ReportCard title={title} info={info}>
      {total === 0 ? <p className="py-6 text-center text-sm text-slate-500">{empty}</p> : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full bg-cream" aria-hidden="true">
            {parts.map((p) => <div key={p.key} className={tones[p.key]} style={{ width: `${(p.count / total) * 100}%` }} />)}
          </div>
          <ul className="mt-4 space-y-3">
            {parts.map((p) => (
              <li key={p.key} className="flex items-start justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${tones[p.key]}`} aria-hidden="true" />{p.label}</span>
                <span className="text-right tabular-nums">
                  <span className="block text-navy">{p.count} · {Math.round((p.count / total) * 100)}%</span>
                  {p.value != null && <span className="block text-[11px] text-slate-400">{fmtValue(p.value, format, currency)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ReportCard>
  );
}