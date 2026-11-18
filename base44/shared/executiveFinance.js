import { openLedger, leftOut, ledgerReply } from './executiveLedger.js';
import { ledgerCells, totalOf, budgetReader, figures } from './executiveTotals.js';

// Executive Summary: profit and loss and cash for the header picker's company
// or branch, for the standard period, its comparison and each day or month of
// the period. Posted journals only.
export async function executiveFinanceSummary(ctx, input) {
  const led = await openLedger(ctx, input);
  if (led.reply) return led.reply;
  const { query, period, comparison, company, branch, unit, scale, byBudget } = led;
  const [omitted, cells, earlierCells, budget] = await Promise.all([
    leftOut(ctx, led),
    ledgerCells(ctx, query, period, unit),
    byBudget ? null : ledgerCells(ctx, query, comparison, unit),
    byBudget ? budgetReader(ctx, company, branch, period) : null,
  ]);
  // The comparison of one trend point: the budget for its dates, or the
  // matching day / month of the comparison period.
  const otherOf = (cell, i) => (byBudget ? budget && budget(cell.from, cell.to) : earlierCells[i] || null);
  const previous = byBudget ? budget && budget(period.from, period.to) : totalOf(earlierCells);
  return {
    ...ledgerReply(led, { omitted, budget, hasActivity: cells.some((c) => c.lines > 0) }),
    current: figures(totalOf(cells), scale),
    previous: previous ? figures(previous, scale) : null,
    trend: cells.map((cell, i) => {
      const other = otherOf(cell, i);
      return { from: cell.from, to: cell.to, current: figures(cell, scale), previous: other ? figures(other, scale) : null };
    }),
  };
}