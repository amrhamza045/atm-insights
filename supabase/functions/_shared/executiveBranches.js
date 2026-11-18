import { requireValue } from './financeValidation.js';
import { reportUnits } from './financeAnalyticsScope.js';
import { openLedger, leftOut, ledgerReply, within, PL, TOO_MANY } from './executiveLedger.js';
import { budgetReader, figures } from './executiveTotals.js';

// Branch Comparison: every branch of the picked company side by side for the
// period, each beside the comparison period or its own approved budget. A
// person locked to one branch sees only that branch.
const zero = () => ({ ...Object.fromEntries(PL.map((c) => [c, 0])), lines: 0 });

// P&L unit totals per branch over a range.
async function branchTotals(ctx, query, range) {
  const r = await ctx.svc.entities.FinanceLedgerLine.aggregate({
    query: { ...query, entry_date: within(range), classification: { $in: PL } }, groupBy: ['branch_id', 'classification'], sum: ['debit_units', 'credit_units'], limit: 1000,
  });
  requireValue(!r.truncated, TOO_MANY);
  const out = new Map();
  for (const row of r.rows) {
    const t = out.get(row.branch_id) || zero(), debit = reportUnits(row.sum_debit_units), credit = reportUnits(row.sum_credit_units);
    t[row.classification] += row.classification === 'revenue' ? credit - debit : debit - credit;
    t.lines += Number(row.count || 0);
    out.set(row.branch_id, t);
  }
  return out;
}

export async function executiveBranches(ctx, input) {
  const led = await openLedger(ctx, input, { module: 'branch_comparison', wholeCompany: true });
  if (led.reply) return led.reply;
  const { query, period, comparison, company, scale, byBudget } = led;
  const ids = led.branch ? [led.branch] : query.branch_id.$in;
  const [omitted, current, earlier, branches, budgets] = await Promise.all([
    leftOut(ctx, led),
    branchTotals(ctx, query, period),
    byBudget ? null : branchTotals(ctx, query, comparison),
    ids.length ? ctx.svc.entities.Branch.filter({ id: { $in: ids } }, { limit: 200 }) : { items: [] },
    byBudget ? Promise.all(ids.map((id) => budgetReader(ctx, company, id, period))) : null,
  ]);
  const byId = new Map(branches.items.map((b) => [b.id, b]));
  const rows = ids.map((id, i) => {
    const t = current.get(id) || zero(), other = byBudget ? budgets[i] && budgets[i](period.from, period.to) : earlier.get(id) || zero();
    return { id, name: byId.get(id)?.name || 'Removed branch', active: byId.get(id)?.is_active !== false, lines: t.lines, current: figures(t, scale), previous: other ? figures(other, scale) : null };
  }).filter((r) => r.active || r.lines > 0).sort((a, b) => b.current.revenue - a.current.revenue);
  return {
    ...ledgerReply(led, { omitted, budget: byBudget ? budgets.some(Boolean) : null, hasActivity: rows.some((r) => r.lines > 0) }),
    selected_branch_id: ids.includes(input.branch_id) ? input.branch_id : null,
    branches: rows,
  };
}