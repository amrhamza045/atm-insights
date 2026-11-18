import { openLedger, leftOut, ledgerReply, PL } from './executiveLedger.js';
import { budgetReader, figures } from './executiveTotals.js';
import { accountTotals, accountRows, plTotals } from './executiveAccounts.js';

// Costs & Budget: each P&L section against the approved budget for the period,
// whatever the chosen comparison, and every cost account (cost of sales and
// operating expenses) beside the comparison period. Budgets are set per
// section, so accounts have no budget of their own.
const COSTS = ['cogs', 'operating_expenses'];

export async function executiveCosts(ctx, input) {
  const led = await openLedger(ctx, input, { module: 'financial' });
  if (led.reply) return led.reply;
  const { query, period, comparison, company, branch, scale, byBudget } = led;
  const [omitted, current, earlier, budget] = await Promise.all([
    leftOut(ctx, led),
    accountTotals(ctx, query, period, PL),
    byBudget ? null : accountTotals(ctx, query, comparison, COSTS),
    budgetReader(ctx, company, branch, period),
  ]);
  const costs = current.filter((r) => COSTS.includes(r.classification));
  const accounts = await accountRows(ctx, company, scale, costs, earlier);
  return {
    ...ledgerReply(led, { omitted, budget, hasActivity: current.length > 0 }),
    actual: figures(plTotals(current), scale),
    budget: budget ? figures(budget(period.from, period.to), scale) : null,
    accounts: accounts.sort((a, b) => b.current - a.current),
  };
}