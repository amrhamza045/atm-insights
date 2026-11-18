import { changeOf, changeText, changeTone } from "./change";
import { fmtValue } from "./formatters";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";

// A table cell with one figure and, under it, its change against the
// comparison in green (better) or red (worse).
export default function FigureCell({ metric, value, previous, currency }) {
  const def = METRICS[metric], c = changeOf(value, previous, def.format, def.goodWhen), text = c && changeText(c);
  return (
    <td className="py-2 pl-3 text-right tabular-nums">
      <span className="block">{fmtValue(value, def.format, currency)}</span>
      {text && (
        <span className={`block text-[11px] ${changeTone(c.better)}`}>
          {text}
          {c.better !== null && <span className="sr-only">{c.better ? " better" : " worse"}</span>}
        </span>
      )}
    </td>
  );
}