import { AlertTriangle, Building2, Inbox, Loader2, Lock, PowerOff } from "lucide-react";

// What a report shows instead of its content: loading, an error, nothing yet,
// Finance still indexing new entries, no Finance company, its module off, no
// permission, or too few people to show without showing someone's own figures.
const STATES = {
  loading: { icon: Loader2, spin: true, text: "Loading figures…" },
  indexing: { icon: Loader2, spin: true, text: "Finance is adding newly posted entries to its reports. This updates by itself in a few seconds." },
  empty: { icon: Inbox, text: "Nothing recorded for this period yet." },
  module_off: { icon: PowerOff, text: "This module is switched off, so its figures aren't shown." },
  no_company: { icon: Building2, text: "Finance has no company for this selection yet. Set one up in Finance to see ledger figures." },
  error: { icon: AlertTriangle, text: "These figures couldn't be loaded." },
  no_access: { icon: Lock, text: "This report needs financial viewing permission." },
  too_few: { icon: Lock, text: "Fewer than three people are in this selection, so its figures aren't shown: they would be someone's own. Pick more branches or the whole company." },
};

export default function ReportState({ state, message, onRetry, compact = false }) {
  const s = STATES[state] || STATES.empty;
  const Icon = s.icon;
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-2 text-center text-sm text-slate-500 rounded-2xl border border-slate-200 bg-white ${compact ? "py-6" : "py-12"}`}>
      <Icon className={`w-5 h-5 ${state === "error" ? "text-danger-600" : "text-slate-400"} ${s.spin ? "animate-spin" : ""}`} aria-hidden="true" />
      <p className="max-w-md px-4">{message || s.text}</p>
      {onRetry && (
        <button type="button" onClick={() => onRetry()} className="text-xs font-medium text-navy underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}