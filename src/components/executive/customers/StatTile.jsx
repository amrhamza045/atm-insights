import { fmtValue } from "@/components/executive/kit/formatters";
import { changeOf, changeText, changeTone } from "@/components/executive/kit/change";

// A small figure inside a card, with its change against the comparison
// (green better, red worse) or a note such as "As of today" instead.
export default function StatTile({ label, value, previous, format, goodWhen = "up", currency, note }) {
  const change = note || previous == null ? null : changeOf(value, previous, format, goodWhen), text = change && changeText(change);
  return (
    <div className="min-w-0 rounded-xl bg-cream px-3 py-2">
      <dt className="truncate text-[11px] text-slate-500">{label}</dt>
      <dd className="truncate font-semibold tabular-nums text-navy">{fmtValue(value, format, currency)}</dd>
      {(note || text) && <dd className={`text-[11px] ${note ? "text-slate-400" : changeTone(change.better)}`}>{note || text}</dd>}
    </div>
  );
}