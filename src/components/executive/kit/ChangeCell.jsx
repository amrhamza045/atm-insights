import { changeOf, changeText, changeTone } from "./change";
import { fmtMoney } from "./formatters";

// How a figure moved against its comparison, for tables: the difference with
// the % change below (percentages move in points), green when it moved the
// better way and red when the worse way. missing: shown without a comparison.
export default function ChangeCell({ value, previous, format = "money", goodWhen = "up", currency, missing = "—" }) {
  const c = changeOf(value, previous, format, goodWhen);
  if (!c) return <span className="text-xs text-slate-400">{missing}</span>;
  const pct = changeText(c);
  return (
    <span className={`inline-flex flex-col items-end leading-tight tabular-nums ${changeTone(c.better)}`}>
      <span className="font-medium">{format === "percent" ? pct : `${c.diff > 0 ? "+" : ""}${fmtMoney(c.diff, currency)}`}</span>
      {format !== "percent" && <span className="text-[11px]">{pct ?? "new"}</span>}
      {c.better !== null && <span className="sr-only">{c.better ? "better" : "worse"}</span>}
    </span>
  );
}