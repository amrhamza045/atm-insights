import { openLedger, leftOut, ledgerReply, PL } from './executiveLedger.js';
import { budgetReader, figures } from './executiveTotals.js';
import { accountTotals, accountRows, plTotals } from './executiveAccounts.js';

// Profit & Loss: every P&L account for the period beside the comparison
// period, and the section totals beside the comparison period or the approved
// budget (budgets are set per section, so accounts have none of their own).
export async function executivePnl(ctx, input) {
  const led = await openLedger(ctx, input, { module: 'financial' });
  if (led.reply) return led.reply;
  const { query, period, comparison, company, branch, scale, byBudget } = led;
  const [omitted, current, earlier, budget] = await Promise.all([
    leftOut(ctx, led),
    accountTotals(ctx, query, period, PL),
    byBudget ? null : accountTotals(ctx, query, comparison, PL),
    byBudget ? budgetReader(ctx, company, branch, period) : null,
  ]);
  const previous = byBudget ? budget && budget(period.from, period.to) : plTotals(earlier);
  return {
    ...ledgerReply(led, { omitted, budget, hasActivity: current.length > 0 }),
    current: figures(plTotals(current), scale),
    previous: previous ? figures(previous, scale) : null,
    accounts: await accountRows(ctx, company, scale, current, earlier),
  };
}