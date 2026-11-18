import { requireValue } from './financeValidation.js';
import { reportUnits } from './financeAnalyticsScope.js';
import { PL, TOO_MANY, within } from './executiveLedger.js';

// Ledger totals per account for Executive Dashboard reports. An account's
// amount runs its natural way: revenue and other income as credits minus
// debits, costs and tax as debits minus credits.
const CREDITED = new Set(['revenue', 'other_result']);

// { code, classification, lines, amount } per account of the given classes, in units.
export async function accountTotals(ctx, query, range, classes) {
  const r = await ctx.svc.entities.FinanceLedgerLine.aggregate({
    query: { ...query, entry_date: within(range), classification: { $in: classes } },
    groupBy: ['account_code', 'classification'],
    sum: ['debit_units', 'credit_units'],
    limit: 1000,
  });
  requireValue(!r.truncated, TOO_MANY);
  return r.rows.map((row) => {
    const debit = reportUnits(row.sum_debit_units), credit = reportUnits(row.sum_credit_units);
    return { code: row.account_code, classification: row.classification, lines: Number(row.count || 0), amount: CREDITED.has(row.classification) ? credit - debit : debit - credit };
  });
}

// P&L totals of account rows the way the ledger totals keep them (other items
// as a net expense), for figures().
export function plTotals(rows) {
  const t = Object.fromEntries(PL.map((c) => [c, 0]));
  for (const r of rows) t[r.classification] += r.classification === 'other_result' ? -r.amount : r.amount;
  return t;
}

// Account rows of the period beside the comparison period (previous null
// without one), with the accounts' current names, in currency. Accounts that
// net to nothing in both are left out.
export async function accountRows(ctx, company, scale, current, earlier) {
  const all = [...current, ...(earlier || [])], codes = [...new Set(all.map((r) => r.code))];
  const { items } = codes.length
    ? await ctx.svc.entities.FinanceAccount.filter({ company_id: company.id, code: { $in: codes } }, { limit: 1000 })
    : { items: [] };
  const names = new Map(items.map((a) => [a.code, a.name])), rows = new Map();
  for (const r of all) {
    if (!rows.has(r.code)) rows.set(r.code, { code: r.code, name: names.get(r.code) || r.code, classification: r.classification, current: 0, previous: earlier ? 0 : null });
  }
  for (const r of current) rows.get(r.code).current = r.amount / scale;
  for (const r of earlier || []) rows.get(r.code).previous = r.amount / scale;
  return [...rows.values()].filter((r) => r.current || r.previous).sort((a, b) => a.code.localeCompare(b.code));
}