import { AlertTriangle, X } from "lucide-react";

export default function RecipientChip({ label, sub, warning, icon: Icon, onRemove }) {
  return (
    <span
      title={warning || sub || label}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1 text-xs ${
        warning ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {warning ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
      <span className="truncate font-medium">{label}</span>
      {sub && !warning && <span className="hidden truncate text-slate-400 sm:inline">{sub}</span>}
      {warning && <span className="truncate">· can't receive it</span>}
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-slate-100" aria-label={`Remove ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}