import { CalendarRange } from "lucide-react";
import { useCateringFilter } from "./CateringFilterContext";
import UncontrolledDateInput from "@/components/shared/UncontrolledDateInput";
import { dateRangeLabel } from "./cateringDateFilter";

const INPUT = "h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700";
const DATE_INPUT = "h-7 w-[8.5rem] px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700";

const GRANULARITIES = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Custom" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);

export default function CateringDateFilter() {
  const { dateFilter, setDateFilter, dateRange } = useCateringFilter();
  const patch = (p) => setDateFilter({ ...dateFilter, ...p });
  const g = dateFilter.granularity || "";
  const label = dateRangeLabel(dateRange);

  const YearSelect = (
    <select className={INPUT} value={dateFilter.year} onChange={(e) => patch({ year: e.target.value })}>
      <option value="">Year</option>
      {YEARS.map((y) => (
        <option key={y} value={String(y)}>{y}</option>
      ))}
    </select>
  );

  const MonthSelect = (
    <select className={INPUT} value={dateFilter.month} onChange={(e) => patch({ month: e.target.value })}>
      <option value="">Month</option>
      {MONTHS.map((m, i) => (
        <option key={m} value={String(i + 1)}>{m}</option>
      ))}
    </select>
  );

  const DaySelect = (
    <select className={INPUT} value={dateFilter.day} onChange={(e) => patch({ day: e.target.value })}>
      <option value="">Day</option>
      {DAYS.map((d) => (
        <option key={d} value={String(d)}>{d}</option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 mr-1">
        <CalendarRange className="w-3.5 h-3.5 text-amber-500" />
        Date:
      </span>

      <div className="flex gap-1.5">
        {GRANULARITIES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => patch({ granularity: g === t.key ? "" : t.key })}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              g === t.key
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(g === "" || g === "day") && <>{DaySelect}{MonthSelect}{YearSelect}</>}
      {g === "month" && <>{MonthSelect}{YearSelect}</>}
      {g === "year" && YearSelect}

      {g === "week" && (
        <>
          <span className="text-xs text-slate-500">Week of</span>
          <UncontrolledDateInput
            value={dateFilter.weekStart}
            onCommit={(v) => patch({ weekStart: v })}
            className={DATE_INPUT}
          />
        </>
      )}

      {g === "custom" && (
        <>
          <span className="text-xs text-slate-500">From</span>
          <UncontrolledDateInput
            value={dateFilter.customFrom}
            onCommit={(v) => patch({ customFrom: v })}
            className={DATE_INPUT}
          />
          <span className="text-xs text-slate-500">To</span>
          <UncontrolledDateInput
            value={dateFilter.customTo}
            onCommit={(v) => patch({ customTo: v })}
            className={DATE_INPUT}
          />
        </>
      )}

      {label && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{label}</span>
      )}
    </div>
  );
}