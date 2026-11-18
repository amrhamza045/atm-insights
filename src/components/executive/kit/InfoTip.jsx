import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";

// The (i) beside a figure or chart: what it shows, how it is calculated and
// where the numbers come from. Pass metric (a METRICS key) or your own text.
export default function InfoTip({ metric, title, calculation, source, note }) {
  const def = (metric && METRICS[metric]) || {};
  const heading = title || def.label;
  const extra = note || def.note;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`How ${heading} is calculated`}
          className="flex-shrink-0 rounded-full text-slate-400 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 text-xs">
        <p className="font-semibold text-navy">{heading}</p>
        <p className="text-slate-600"><span className="font-medium text-slate-700">How: </span>{calculation || def.calculation}</p>
        <p className="text-slate-600"><span className="font-medium text-slate-700">Source: </span>{source || def.source}</p>
        {extra && <p className="text-slate-500">{extra}</p>}
      </PopoverContent>
    </Popover>
  );
}