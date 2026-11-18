import { ExternalLink } from "lucide-react";
import { APPROVAL_BANDS } from "./ApprovalBands";

// Sticky chip row: every non-empty queue with its count; click to jump.
export default function ApprovalSummaryBar({ sections }) {
  const active = sections.filter((s) => s.count > 0);
  if (!active.length) return null;
  const jump = (id) => document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur py-3 -mx-1 px-1 border-b border-slate-200">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {APPROVAL_BANDS.map((band) => {
          const chips = active.filter((s) => s.band === band.id);
          if (!chips.length) return null;
          return (
            <div key={band.id} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mr-1">{band.label}</span>
              {chips.map((s) => (
                <button key={s.id} onClick={() => jump(s.id)}
                  className={`text-xs rounded-full px-2.5 py-1 border flex items-center gap-1 transition-colors ${s.external ? "bg-white border-dashed border-slate-300 text-slate-600 hover:bg-slate-100" : "bg-white border-slate-300 text-slate-800 hover:bg-amber-50 hover:border-amber-300"}`}>
                  {s.title} <span className="font-bold">{s.count}</span>
                  {s.external && <ExternalLink className="w-3 h-3" />}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}