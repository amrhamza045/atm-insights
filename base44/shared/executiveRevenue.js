import { requireValue } from './financeValidation.js';
import { reportUnits } from './financeAnalyticsScope.js';
import { openLedger, leftOut, ledgerReply, within, TOO_MANY } from './executiveLedger.js';
import { ledgerCells, totalOf, budgetReader } from './executiveTotals.js';
import { accountTotals, accountRows } from './executiveAccounts.js';

// Revenue: by income account and by sales channel beside the comparison
// period, and day by day / month by month beside the comparison or budget.
// A channel whose module is switched off keeps its posted revenue, marked off.
const CHANNELS = {
  catering: ['Catering', 'catering'],
  dine_in: ['Dine-in', 'pos'],
  takeaway: ['Takeaway', 'pos'],
  drive_through: ['Drive-through', 'pos'],
  delivery: ['Delivery', 'delivery'],
};

// Revenue per channel tag of the ledger entries (credits minus debits, units).
async function channelTotals(ctx, query, range) {
  const r = await ctx.svc.entities.FinanceLedgerLine.aggregate({
    query: { ...query, entry_date: within(range), classification: 'revenue' }, groupBy: 'service_type', sum: ['debit_units', 'credit_units'], limit: 100,
  });
  requireValue(!r.truncated, TOO_MANY);
  const out = new Map();
  for (const row of r.rows) {
    const key = row.service_type || 'unassigned';
    out.set(key, (out.get(key) || 0) + reportUnits(row.sum_credit_units) - reportUnits(row.sum_debit_units));
  }
  return out;
}

function channelRows(current, earlier, isOn, scale) {
  return [...new Set([...current.keys(), ...(earlier ? earlier.keys() : [])])].map((key) => {
    const [label, module] = CHANNELS[key] || [key === 'unassigned' ? 'Not linked to a channel' : key.replaceAll('_', ' '), null];
    return { key, label, module_off: !!module && !isOn(module), current: (current.get(key) || 0) / scale, previous: earlier ? (earlier.get(key) || 0) / scale : null };
  }).filter((r) => r.current || r.previous).sort((a, b) => b.current - a.current);
}

export async function executiveRevenue(ctx, input) {
  const led = await openLedger(ctx, input, { module: 'financial', analytics: true });
  if (led.reply) return led.reply;
  const { query, period, comparison, company, branch, unit, scale, byBudget, isOn } = led, compared = !byBudget;
  const [omitted, accounts, earlierAccounts, channels, earlierChannels, cells, earlierCells, budget] = await Promise.all([
    leftOut(ctx, led),
    accountTotals(ctx, query, period, ['revenue']),
    compared ? accountTotals(ctx, query, comparison, ['revenue']) : null,
    channelTotals(ctx, query, period),
    compared ? channelTotals(ctx, query, comparison) : null,
    ledgerCells(ctx, query, period, unit),
    compared ? ledgerCells(ctx, query, comparison, unit) : null,
    byBudget ? budgetReader(ctx, company, branch, period) : null,
  ]);
  const money = (units) => (units === null || units === undefined ? null : units / scale);
  // The budgeted revenue for some dates (null without a budget or with an empty month).
  const budgeted = (from, to) => (budget ? budget(from, to).revenue : null);
  return {
    ...ledgerReply(led, { omitted, budget, hasActivity: accounts.length > 0 }),
    current: { revenue: money(totalOf(cells).revenue) },
    previous: { revenue: money(byBudget ? budgeted(period.from, period.to) : totalOf(earlierCells).revenue) },
    trend: cells.map((cell, i) => ({
      from: cell.from,
      to: cell.to,
      current: money(cell.revenue),
      previous: money(byBudget ? budgeted(cell.from, cell.to) : earlierCells[i]?.revenue),
    })),
    accounts: await accountRows(ctx, company, scale, accounts, earlierAccounts),
    channels: channelRows(channels, earlierChannels, isOn, scale),
  };
}