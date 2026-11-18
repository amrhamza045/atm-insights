import { reportUnits } from './financeAnalyticsScope.js';
import { openLedger, leftOut, ledgerReply, within } from './executiveLedger.js';
import { ledgerCells } from './executiveTotals.js';

// Cash & Balances: cash received and paid out in the period (moves between the
// company's own cash and bank accounts left out), the balance day by day or
// month by month, supplier payables at the period end and, with Catering on,
// what customers still owe as of today.
const MOVED = { $or: ['cash_operating', 'cash_investing', 'cash_financing', 'cash_unclassified'].map((f) => ({ [f]: { $ne: 0 } })) };
const total = (rows, field) => rows.reduce((s, r) => s + Number(r[field] || 0), 0);

// Cash units of the ledger lines matching a query, summed.
const cashSum = (ctx, where) => ctx.svc.entities.FinanceLedgerLine
  .aggregate({ query: where, groupBy: 'company_id', sum: ['cash_units'], limit: 5 })
  .then((r) => reportUnits(r.rows[0]?.sum_cash_units));

// Units into and out of cash on the lines matching a query (transfers and opening balances left out).
const flows = (ctx, where) => Promise.all([cashSum(ctx, { ...where, cash_units: { $gt: 0 }, ...MOVED }), cashSum(ctx, { ...where, cash_units: { $lt: 0 }, ...MOVED })])
  .then(([into, out]) => ({ into, out: -out }));

// Units the range's voids (posted reversal journals) moved, a page of journals at a time.
async function voidFlows(ctx, query, range) {
  const where = { ...query, status: 'posted', kind: 'reversal', entry_date: within(range) };
  const moved = { into: 0, out: 0 };
  let cursor = null;
  do {
    const page = await ctx.svc.entities.FinanceJournal.filter(where, { fields: ['id'], limit: 200, ...(cursor && { cursor }) });
    if (page.items.length) {
      const f = await flows(ctx, { ...query, journal_id: { $in: page.items.map((j) => j.id) } });
      moved.into += f.into;
      moved.out += f.out;
    }
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return moved;
}

// Units in and out of cash over a range, and opening balances entered in it.
// A void undoes the flow it reverses instead of counting as one of its own:
// a voided receipt lowers cash received, a voided payment lowers cash paid out.
async function cashMoves(ctx, query, range) {
  const where = { ...query, entry_date: within(range) };
  const [moved, voided, opening] = await Promise.all([flows(ctx, where), voidFlows(ctx, query, range), cashSum(ctx, { ...where, cash_opening: { $ne: 0 } })]);
  const undone = voided.into + voided.out;
  return { received: moved.into - undone, paid: moved.out - undone, opening };
}

// Supplier payables accounts: bound to supplier payables in Finance › Mapping
// Accounts, or the Suppliers account of Automatic posting.
export async function payableCodes(ctx, company) {
  const { items } = await ctx.svc.entities.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: 'VENDOR_AP_ACCOUNT' }, { limit: 100 });
  const ids = [...new Set([...items.map((b) => b.account_id), company.module_policy?.map?.suppliers].filter(Boolean))];
  if (!ids.length) return [];
  const accounts = await ctx.svc.entities.FinanceAccount.filter({ company_id: company.id, id: { $in: ids } }, { limit: 100 });
  return accounts.items.map((a) => a.code);
}

// What the company owes suppliers at the end of a day (credits minus debits, units).
async function owedAt(ctx, query, codes, day) {
  if (!codes.length) return null;
  const r = await ctx.svc.entities.FinanceLedgerLine.aggregate({ query: { ...query, account_code: { $in: codes }, entry_date: { $lte: day } }, groupBy: 'company_id', sum: ['debit_units', 'credit_units'], limit: 5 });
  return reportUnits(r.rows[0]?.sum_credit_units) - reportUnits(r.rows[0]?.sum_debit_units);
}

// Catering balances of the report's branches as of today, in currency.
async function customerBalances(ctx, query, today) {
  const events = ctx.svc.entities.CateringEvent, where = { branch_id: query.branch_id };
  const [held, ahead] = await Promise.all([
    events.aggregate({ query: { ...where, status: 'completed', balance_due: { $gt: 0 } }, groupBy: 'status', sum: ['balance_due'], limit: 5 }),
    events.aggregate({ query: { ...where, status: { $in: ['confirmed', 'in_progress'] }, event_date: { $gte: today } }, groupBy: 'status', sum: ['balance_due', 'total_paid'], limit: 5 }),
  ]);
  return {
    available: true,
    held_unpaid: total(held.rows, 'sum_balance_due'),
    held_unpaid_events: total(held.rows, 'count'),
    balance_due: total(ahead.rows, 'sum_balance_due'),
    deposits_held: total(ahead.rows, 'sum_total_paid'),
  };
}

export async function executiveCash(ctx, input) {
  const led = await openLedger(ctx, input, { module: 'financial', analytics: true });
  if (led.reply) return led.reply;
  const { query, period, comparison, company, unit, scale, byBudget, isOn, today } = led, compared = !byBudget, catering = isOn('catering');
  const codes = await payableCodes(ctx, company);
  const [omitted, cells, earlierCells, moves, earlierMoves, owed, earlierOwed, customers] = await Promise.all([
    leftOut(ctx, led),
    ledgerCells(ctx, query, period, unit),
    compared ? ledgerCells(ctx, query, comparison, unit) : null,
    cashMoves(ctx, query, period),
    compared ? cashMoves(ctx, query, comparison) : null,
    owedAt(ctx, query, codes, period.to),
    compared ? owedAt(ctx, query, codes, comparison.to) : null,
    catering ? customerBalances(ctx, query, today) : { available: false, reason: 'module_off' },
  ]);
  const money = (units) => (units === null || units === undefined ? null : units / scale);
  const summary = (c, m) => {
    const opening = c[0].closing - c[0].cash, closing = c.at(-1).closing;
    return { opening_cash: money(opening), cash_received: money(m.received), cash_paid: money(m.paid), opening_added: money(m.opening), net_cash_change: money(closing - opening), closing_cash: money(closing) };
  };
  return {
    ...ledgerReply(led, { omitted, budgeted: false, hasActivity: cells.some((c) => c.lines > 0) }),
    current: summary(cells, moves),
    previous: compared ? summary(earlierCells, earlierMoves) : null,
    trend: cells.map((cell, i) => ({ from: cell.from, to: cell.to, current: money(cell.closing), previous: compared && earlierCells[i] ? money(earlierCells[i].closing) : null })),
    suppliers: { mapped: codes.length > 0, current: money(owed), previous: money(earlierOwed) },
    customers,
  };
}