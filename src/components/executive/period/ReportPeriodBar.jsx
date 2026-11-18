import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIODS, COMPARISONS } from "./reportPeriod";
import useReportPeriod from "./useReportPeriod";

// Period and comparison for the reports that use the standard periods.
// budget=false: reports with no budget offer only the previous period and last year.
export default function ReportPeriodBar({ budget = true }) {
  const { period, compare: chosen, setPeriod, setCompare } = useReportPeriod();
  const options = budget ? COMPARISONS : COMPARISONS.filter((c) => c.value !== "budget");
  const compare = options.some((c) => c.value === chosen) ? chosen : "previous";
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <div role="group" aria-label="Report period" className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            title={p.title}
            aria-pressed={period === p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${period === p.value ? "bg-navy text-white" : "text-slate-600 hover:bg-cream"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Compare with</span>
        <Select value={compare} onValueChange={setCompare}>
          <SelectTrigger className="h-9 w-48 bg-white text-xs" aria-label="Compare with">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}