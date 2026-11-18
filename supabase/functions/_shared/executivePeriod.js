import { getCompanyOffset, companyDay, dayWindow, TIMEZONE_MISSING } from './companyTimezone.js';
import { requireValue } from './financeValidation.js';

// The Executive Dashboard's standard report periods and comparisons, on the
// company calendar (Admin › Settings › Timezone), so every report covers the
// same days. Ranges are inclusive "YYYY-MM-DD" dates.
export const PERIODS = { mtd: 'Month to date', last_month: 'Last month', qtd: 'Quarter to date', ytd: 'Year to date', '12m': 'Last 12 months' };
export const COMPARISONS = { previous: 'Previous period', last_year: 'Same period last year', budget: 'Budget' };

const toDay = (s) => new Date(`${s}T00:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = toDay(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
// Month index m is 0-based and may run past either end of the year.
const monthStart = (y, m) => iso(new Date(Date.UTC(y, m, 1)));
const monthEnd = (y, m) => iso(new Date(Date.UTC(y, m + 1, 0)));
const yearMonth = (s) => [Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1];
const earlier = (a, b) => (a < b ? a : b);
// Number of days in an inclusive range.
export const dayCount = (from, to) => Math.round((toDay(to) - toDay(from)) / 86400000) + 1;
// The same day of the month `back` months earlier, capped at that month's end;
// a month's last day maps to the earlier month's last day (31 Mar → 28 Feb,
// 28 Feb 2029 → 29 Feb 2028), so full months compare with full months.
const monthsBefore = (s, back) => {
  const [y, m] = yearMonth(s), end = monthEnd(y, m - back);
  return s === monthEnd(y, m) ? end : earlier(`${end.slice(0, 8)}${s.slice(8)}`, end);
};

function currentRange(key, today) {
  const [y, m] = yearMonth(today);
  if (key === 'last_month') return { from: monthStart(y, m - 1), to: monthEnd(y, m - 1) };
  if (key === 'qtd') return { from: monthStart(y, m - (m % 3)), to: today };
  if (key === 'ytd') return { from: `${y}-01-01`, to: today };
  if (key === '12m') return { from: monthStart(y, m - 11), to: today };
  return { from: monthStart(y, m), to: today };
}

// The same stretch a year earlier.
const lastYearRange = (range) => ({ from: monthsBefore(range.from, 12), to: monthsBefore(range.to, 12) });

// The period just before: the same days of the previous month or quarter, the
// month before last month, or (year to date, last 12 months) a year earlier.
function previousRange(key, range) {
  if (key === 'ytd' || key === '12m') return lastYearRange(range);
  const back = key === 'qtd' ? 3 : 1;
  return { from: monthsBefore(range.from, back), to: monthsBefore(range.to, back) };
}

// input.period / input.compare; unknown values fall back to month to date
// against the previous period. unit: trend points per day up to a quarter,
// per month beyond. stamps: the same ranges as timestamp windows. offset: the
// company's UTC offset in minutes.
export async function resolvePeriod(entities, input) {
  const key = PERIODS[input.period] ? input.period : 'mtd', compare = COMPARISONS[input.compare] ? input.compare : 'previous';
  const offset = await getCompanyOffset(entities);
  requireValue(offset !== null, TIMEZONE_MISSING);
  const today = companyDay(offset), current = currentRange(key, today);
  const other = compare === 'budget' ? current : compare === 'last_year' ? lastYearRange(current) : previousRange(key, current);
  const stamps = (r) => ({ $gte: new Date(dayWindow(r.from, offset).start).toISOString(), $lt: new Date(dayWindow(r.to, offset).end).toISOString() });
  return {
    today,
    offset,
    unit: dayCount(current.from, current.to) <= 92 ? 'day' : 'month',
    period: { key, label: PERIODS[key], ...current },
    comparison: { key: compare, label: COMPARISONS[compare], ...other },
    stamps: { current: stamps(current), comparison: stamps(other) },
  };
}

// The days, or calendar months, of a range: [{ from, to }] inside it.
export function rangeBuckets(range, unit) {
  const out = [];
  if (unit === 'day') {
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push({ from: d, to: d });
    return out;
  }
  const [y, first] = yearMonth(range.from);
  for (let m = first, start = range.from; start <= range.to; m += 1, start = monthStart(y, m)) {
    out.push({ from: start, to: earlier(monthEnd(y, m), range.to) });
  }
  return out;
}