import { requireValue } from './financeValidation.js';
import { reportUnits } from './financeAnalyticsScope.js';
import { rangeBuckets, dayCount } from './executivePeriod.js';
import { PL, TOO_MANY, within } from './executiveLedger.js';

// Ledger totals for Executive Dashboard reports, in currency units: P&L and
// cash per day or month of a range, the approved budget for any dates, and
// the figures a reply shows. Revenue counts credits minus debits; every other
// P&L class (other items as a net expense) debits minus credits.
const SUMS = ['debit_units', 'credit_units', 'cash_units'];

// Per day or month of a range: P&L movements, cash movement and cash on hand
// at its end.
export async function ledgerCells(ctx, query, range, unit) {
  const lines = ctx.svc.entities.FinanceLedgerLine, inRange = { ...query, entry_date: within(range) };
  const [moves, before] = await Promise.all([
    lines.aggregate(unit === 'day'
      ? { query: inRange, groupBy: ['entry_date', 'classification'], sum: SUMS, limit: 1000 }
      : { query: inRange, groupBy: 'classification', dateBucket: { field: 'entry_date', unit: 'month' }, sum: SUMS, limit: 1000 }),
    lines.aggregate({ query: { ...query, entry_date: { $lt: range.from } }, groupBy: 'company_id', sum: ['cash_units'], limit: 5 }),
  ]);
  requireValue(!moves.truncated, TOO_MANY);
  const size = unit === 'day' ? 10 : 7;
  const cells = rangeBuckets(range, unit).map((b) => ({ ...b, lines: 0, cash: 0, ...Object.fromEntries(PL.map((c) => [c, 0])) }));
  const index = new Map(cells.map((cell) => [cell.from.slice(0, size), cell]));
  for (const r of moves.rows) {
    const cell = index.get(String(r.entry_date).slice(0, size)), debit = reportUnits(r.sum_debit_units), credit = reportUnits(r.sum_credit_units);
    requireValue(cell, 'A reporting group fell outside the period.');
    cell.lines += Number(r.count || 0);
    cell.cash += reportUnits(r.sum_cash_units);
    if (PL.includes(r.classification)) cell[r.classification] += r.classification === 'revenue' ? credit - debit : debit - credit;
  }
  let cash = reportUnits(before.rows[0]?.sum_cash_units);
  for (const cell of cells) { cash += cell.cash; cell.closing = cash; }
  return cells;
}

export const totalOf = (cells) => ({
  ...Object.fromEntries(PL.map((c) => [c, cells.reduce((s, x) => s + x[c], 0)])),
  lines: cells.reduce((s, x) => s + x.lines, 0),
  closing: cells.at(-1).closing,
});

// The approved Finance budget of this company or branch (Budget & forecast),
// read for any dates: each month's amount spread evenly over its days. null
// without an approved budget; a category is null when a month it needs is empty.
export async function budgetReader(ctx, company, branch, range) {
  const years = [...new Set([range.from, range.to].map((d) => Number(d.slice(0, 4))))];
  const keys = years.map((y) => `${company.id}:${branch || 'company'}:${y}`);
  const { items } = await ctx.svc.entities.FinanceBudget.filter({ budget_key: { $in: keys }, status: 'approved' }, { limit: 10 });
  if (!items.length) return null;
  const amounts = new Map(items.flatMap((b) => (b.values || []).map((v) => [`${b.year}-${v.month}-${v.category}`, v.amount_units])));
  return (from, to) => Object.fromEntries(PL.map((category) => {
    let total = 0;
    for (const m of rangeBuckets({ from, to }, 'month')) {
      const year = Number(m.from.slice(0, 4)), month = Number(m.from.slice(5, 7)), amount = amounts.get(`${year}-${month}-${category}`);
      if (amount === null || amount === undefined) return [category, null];
      total += (amount * dayCount(m.from, m.to)) / new Date(Date.UTC(year, month, 0)).getUTCDate();
    }
    return [category, Math.round(total)];
  }));
}

const less = (a, ...rest) => (a === null || rest.some((v) => v === null) ? null : rest.reduce((s, v) => s - v, a));

// Currency amounts and margins from unit totals. Budgets carry no cash, and a
// figure that needs a missing budget amount is null.
export function figures(t, scale) {
  const gross = less(t.revenue, t.cogs), operating = less(gross, t.operating_expenses), net = less(operating, t.other_result, t.income_tax);
  const money = (v) => (v === null || v === undefined ? null : v / scale);
  const margin = (v) => (v === null || !(t.revenue > 0) ? null : (v / t.revenue) * 100);
  return {
    revenue: money(t.revenue), cost_of_sales: money(t.cogs), gross_profit: money(gross), gross_margin: margin(gross),
    operating_expenses: money(t.operating_expenses), operating_profit: money(operating), other_result: money(t.other_result),
    income_tax: money(t.income_tax), net_profit: money(net), net_margin: margin(net), closing_cash: money(t.closing),
  };
}