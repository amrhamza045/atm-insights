import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";

const INFO = {
  calculation: "Events dated today or later at each stage, with their quote totals. Each bar is the stage's share of the total value ahead.",
  source: "Catering › events of the selected branches.",
};

// The events ahead at each stage, from first enquiry to in progress.
export default function StageCard({ stages, currency }) {
  const total = stages.reduce((s, x) => s + x.value, 0);
  return (
    <ReportCard title="By stage" info={INFO}>
      <ul className="space-y-3">
        {stages.map((s) => (
          <li key={s.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-slate-700">{s.label} <span className="text-xs text-slate-400">· {s.count}</span></span>
              <span className="tabular-nums text-navy">{fmtValue(s.value, "money", currency)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-cream" aria-hidden="true">
              <div className={`h-1.5 rounded-full ${s.booked ? "bg-navy" : "bg-gold"}`} style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </ReportCard>
  );
}