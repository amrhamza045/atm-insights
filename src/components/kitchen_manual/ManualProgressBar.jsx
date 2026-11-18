import { useMemo } from "react";

/**
 * Reusable progress bar that works at any level.
 * Props:
 *  - entries: KitchenManual entries to count
 *  - total: total expected items
 *  - label: title for this progress bar
 *  - lang: "en" | "ar"
 *  - compact: smaller variant for inline use
 */
export default function ManualProgressBar({ entries = [], total = 0, label, lang = "en", compact = false }) {
  const completed = useMemo(
    () => entries.filter(e => e?.status === "approved").length,
    [entries]
  );
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = pct === 100 ? "#16a34a" : pct >= 60 ? "#d97706" : "#7c3030";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden min-w-[60px]">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">{label}</span>
          <span className="text-xs text-slate-400">
            {completed} / {total} {lang === "ar" ? "معتمد" : "approved"}
          </span>
        </div>
        <span className="text-2xl font-black" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div className="h-3 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}