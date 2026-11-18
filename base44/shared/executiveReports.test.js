import test from 'node:test';
import assert from 'node:assert/strict';

// The reports run on the backend runtime; outside it no secret is set.
globalThis.Deno ??= { env: { get: () => '' } };
const { default: fixture } = await import('./executiveLedgerFixture.js');
const { executiveBranches } = await import('./executiveBranches.js');
const { executivePnl } = await import('./executivePnl.js');
const { executiveCosts } = await import('./executiveCosts.js');
const { executiveCash } = await import('./executiveCash.js');
const { executiveRevenue } = await import('./executiveRevenue.js');

// This month Downtown sells 1,000 dine-in with 400 food cost; Airport earns
// 500 from catering and pays 200 salaries. The same days last month Downtown
// sold 800 and Airport 500.
function seeded(options) {
  const f = fixture(options), { line, dates } = f;
  line('b1', dates.from, '410100', 0, 100000, { service_type: 'dine_in' });
  line('b1', dates.from, '110100', 100000, 0, { service_type: 'dine_in' });
  line('b1', dates.from, '510100', 40000, 0);
  line('b2', dates.from, '410300', 0, 50000, { service_type: 'catering' });
  line('b2', dates.from, '110300', 50000, 0, { service_type: 'catering' });
  line('b2', dates.from, '610100', 20000, 0);
  line('b2', dates.from, '110300', 0, 20000);
  line('b1', dates.previous, '410100', 0, 80000, { service_type: 'dine_in' });
  line('b2', dates.previous, '410300', 0, 50000, { service_type: 'catering' });
  return f;
}

// An approved budget with the same monthly revenue every month and no costs.
const budget = (f, branch, revenue) => ({
  budget_key: `c:${branch || 'company'}:${f.dates.today.slice(0, 4)}`, company_id: 'c', branch_id: branch, year: Number(f.dates.today.slice(0, 4)), status: 'approved',
  values: Array.from({ length: 12 }, (_, i) => ['revenue', 'cogs', 'operating_expenses', 'other_result', 'income_tax']
    .map((category) => ({ month: i + 1, category, amount_units: category === 'revenue' ? revenue : 0 }))).flat(),
});
// The month's budget spread evenly over its days, for the days of the period.
const share = (f, units) => Math.round((units * f.dates.days) / f.dates.monthDays) / 100;
const query = (extra) => ({ company_id: 'c', period: 'mtd', compare: 'previous', ...extra });

test('branch comparison sets every branch of the company beside its own budget and marks the picked branch', async () => {
  const f = seeded();
  f.entities.FinanceBudget.rows.push(budget(f, 'b1', 300000), budget(f, '', 9900000));
  const r = await executiveBranches(f.ctx, { branch_id: 'b2', period: 'mtd', compare: 'budget' });
  assert.equal(r.selected_branch_id, 'b2');
  assert.equal(r.comparison.available, true);
  const [b1, b2] = r.branches;
  assert.deepEqual([b1.name, b1.current.revenue, b1.current.gross_margin], ['Downtown', 1000, 60]);
  assert.equal(b1.previous.revenue, share(f, 300000));
  assert.deepEqual([b2.name, b2.current.net_profit, b2.previous], ['Airport', 300, null]);
});

test('branch comparison against the previous period covers the whole company', async () => {
  const r = await executiveBranches(seeded().ctx, query());
  assert.equal(r.selected_branch_id, null);
  assert.deepEqual(r.branches.map((b) => [b.id, b.current.revenue, b.previous.revenue]), [['b1', 1000, 800], ['b2', 500, 500]]);
});

test('a person locked to a branch compares only their own branch', async () => {
  const r = await executiveBranches(seeded({ locked: 'b2' }).ctx, query());
  assert.deepEqual(r.branches.map((b) => b.id), ['b2']);
});

test('branch comparison closes with multi-branch mode', async () => {
  const r = await executiveBranches(seeded({ disabled: ['multi_branch'] }).ctx, query());
  assert.deepEqual([r.available, r.reason], [false, 'module_off']);
});

test('P&L sections compare with the budget while accounts carry none', async () => {
  const f = seeded();
  f.line('b1', f.dates.from, '710100', 0, 5000);
  f.entities.FinanceBudget.rows.push(budget(f, '', 9000000));
  const r = await executivePnl(f.ctx, query({ compare: 'budget' }));
  assert.deepEqual([r.current.revenue, r.current.other_result, r.current.net_profit], [1500, -50, 950]);
  assert.equal(r.previous.revenue, share(f, 9000000));
  assert.ok(r.accounts.every((a) => a.previous === null));
  assert.equal(r.accounts.find((a) => a.code === '710100').current, 50);
  const p = await executivePnl(f.ctx, query());
  assert.equal(p.accounts.find((a) => a.code === '410100').previous, 800);
});

test('costs compare every section with the budget whatever the comparison, and leave out journals waiting or blocked', async () => {
  const f = seeded();
  f.entities.FinanceBudget.rows.push(budget(f, '', 9000000));
  f.entities.FinanceProposal.rows.push({ company_id: 'c', branch_id: 'b1', entry_date: f.dates.from, status: 'pending' });
  f.entities.FinancePostingIssue.rows.push(
    { company_id: 'c', branch_id: 'b2', entry_date: f.dates.today, status: 'open' },
    { company_id: 'c', branch_id: 'b2', entry_date: f.dates.today, status: 'resolved' },
  );
  const r = await executiveCosts(f.ctx, query());
  assert.deepEqual([r.pending_proposals, r.posting_issues], [1, 1]);
  assert.deepEqual([r.actual.revenue, r.actual.cost_of_sales, r.actual.operating_expenses], [1500, 400, 200]);
  assert.equal(r.budget.revenue, share(f, 9000000));
  assert.deepEqual(r.accounts.map((a) => [a.code, a.current, a.previous]), [['510100', 400, 0], ['610100', 200, 0]]);
  assert.equal((await executiveCosts(seeded().ctx, query())).budget, null);
});

test('the cash bridge runs from opening through received, paid out and opening balances to closing', async () => {
  const f = seeded({ disabled: ['catering'] });
  f.line('b1', f.dates.previous, '110100', 25000, 0);
  f.line('b1', f.dates.from, '110300', 30000, 0, { section: 'opening' });
  f.line('b1', f.dates.from, '110300', 10000, 0, { section: 'transfer' });
  f.line('b1', f.dates.from, '110100', 0, 10000, { section: 'transfer' });
  const r = await executiveCash(f.ctx, query());
  const c = r.current;
  assert.deepEqual([c.opening_cash, c.cash_received, c.cash_paid, c.opening_added, c.closing_cash], [250, 1500, 200, 300, 1850]);
  assert.equal(c.net_cash_change, c.closing_cash - c.opening_cash);
  assert.equal(r.suppliers.mapped, false);
  assert.deepEqual(r.customers, { available: false, reason: 'module_off' });
  const b = await executiveCash(f.ctx, query({ compare: 'budget' }));
  assert.deepEqual([b.previous, b.comparison.reason], [null, 'not_budgeted']);
});

test('a void is taken off the flow it undoes instead of counting as money in and out', async () => {
  const f = seeded({ disabled: ['catering'] });
  f.line('b1', f.dates.from, '110300', 13000, 0);
  f.line('b1', f.dates.from, '110300', 0, 13000, { journal: 'v1' });
  f.entities.FinanceJournal.rows.push({ id: 'v1', company_id: 'c', branch_id: 'b1', status: 'posted', kind: 'reversal', entry_date: f.dates.from, ledger_ready: true, analytics_version: 1 });
  const c = (await executiveCash(f.ctx, query())).current;
  assert.deepEqual([c.cash_received, c.cash_paid, c.net_cash_change], [1500, 200, 1300]);
});

test('revenue keeps channels of a switched-off module, tagged', async () => {
  const r = await executiveRevenue(seeded({ disabled: ['pos'] }).ctx, query());
  assert.equal(r.current.revenue, 1500);
  assert.deepEqual(r.channels.map((c) => [c.key, c.module_off, c.current, c.previous]), [['dine_in', true, 1000, 800], ['catering', false, 500, 500]]);
  assert.deepEqual(r.accounts.map((a) => [a.code, a.current, a.previous]), [['410100', 1000, 800], ['410300', 500, 500]]);
});