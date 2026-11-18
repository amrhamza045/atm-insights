import test from 'node:test';
import assert from 'node:assert/strict';
import { postEventRevenue } from './financeEventRevenue.js';
import { settleEventReceivable, eventCustomerBalances } from './financeEventReceivable.js';
import { buildCustomerAccount } from './customerAccountBuild.js';

function fixture({ tax = 0, receivable = true } = {}) {
  const tables = {};
  const value = (row, path) => path.split('.').reduce((v, k) => (Array.isArray(v) ? v.flatMap((i) => i?.[k] ?? []) : v?.[k]), row);
  const matches = (r, q) => Object.entries(q).every(([k, v]) => {
    const a = value(r, k);
    if (v && typeof v === 'object') return Object.entries(v).every(([op, t]) => (op === '$in' ? t.includes(a) : op === '$ne' ? a !== t : true));
    return Array.isArray(a) ? a.includes(v) : a === v;
  });
  const entities = new Proxy({}, { get: (_, name) => {
    const rows = () => (tables[name] ||= []);
    return {
      async get(id) { const r = rows().find((i) => i.id === id); if (!r) throw Object.assign(Error('Missing record'), { status: 404 }); return structuredClone(r); },
      async filter(q, opts) { const items = rows().filter((r) => matches(r, q)); return opts ? { items: structuredClone(items), has_more: false } : structuredClone(items); },
      async count(q) { return rows().filter((r) => matches(r, q)).length; },
      async create(d) { const r = { ...structuredClone(d), id: `${name}-${rows().length}`, updated_date: 'v1' }; rows().push(r); return structuredClone(r); },
      async update(id, d) { const r = rows().find((i) => i.id === id); Object.assign(r, structuredClone(d)); return structuredClone(r); },
      async updateMany(q, d) { for (const r of rows().filter((x) => matches(x, q))) Object.assign(r, d.$set); },
      async upsert(items, { key } = {}) { for (const it of items) { const at = key ? rows().findIndex((r) => r[key] === it[key]) : -1; if (at >= 0) Object.assign(rows()[at], structuredClone(it)); else rows().push(structuredClone(it)); } return { records: [] }; },
    };
  } });
  const account = (id, code, name) => ({ id, company_id: 'co', code, name, active: true, posting: true, management_mapping: 'mgmt' });
  const bind = (key, account_id) => ({ id: `bind-${key}`, company_id: 'co', mapping_key: key, account_id, priority: 100, effective_from: '2026-01-01', conditions: {}, updated_date: 'v1' });
  tables.FinanceAccount = [account('cash', '110100', 'Cash'), account('adv', '211100', 'Customer advances'), account('ar', '111100', 'Trade receivables'), account('rev', '410300', 'Catering revenue')];
  tables.FinanceAccountBinding = [bind('CUSTOMER_ADVANCE_ACC', 'adv'), bind('EVENT_REVENUE_ACC', 'rev'), ...(receivable ? [bind('CUSTOMER_RECEIVABLE_ACC', 'ar')] : [])];
  tables.SystemSettings = [{ id: 'tz', setting_key: 'timezone_settings', timezone_offset_minutes: 120 }];
  tables.CateringEvent = [{ id: 'e1', branch_id: 'b', client_id: 'c1', event_name: 'Gala', active_quote_id: 'q1', updated_date: 'v1' }];
  tables.CateringQuote = [{ id: 'q1', tax_total: tax, service_charge_total: 0 }];
  // Finalized 22:30 UTC = 00:30 the next day in the company's time zone.
  tables.CateringReconciliation = [{ id: 'r1', status: 'finalized', event_id: 'e1', event_name: 'Gala', branch_id: 'b', client_id: 'c1', quote_id: 'q1', final_billing_total: 1000, finalized_date: '2026-11-10T22:30:00Z', updated_date: 'v1' }];
  const company = { id: 'co', branch_ids: ['b'], currency: 'EGP', currency_decimals: 2, edition: 'fnb', is_test: true, closed_through: '' };
  const ctx = { svc: { entities }, admin: true, permissions: {}, user: { email: 'tester@example.com', role: 'admin' } };
  // A posted receipt (positive) or refund (negative) held against the event.
  const receipt = (amount, date = '2026-11-01') => entities.FinanceJournal.create({ company_id: 'co', branch_id: 'b', status: 'posted', entry_date: date, source_entity: 'JournalEntry',
    lines: amount >= 0 ? [{ account_id: 'cash', debit: amount, credit: 0, cost_center: 'e1' }, { account_id: 'adv', debit: 0, credit: amount, cost_center: 'e1' }] : [{ account_id: 'adv', debit: -amount, credit: 0, cost_center: 'e1' }, { account_id: 'cash', debit: 0, credit: -amount, cost_center: 'e1' }] });
  const balances = () => eventCustomerBalances(ctx, company, 'e1', { advance: ['adv'], receivable: ['ar'] });
  const invoices = () => (tables.FinanceJournal || []).filter((j) => j.source_entity === 'CateringReconciliation');
  return { tables, ctx, company, receipt, balances, invoices, recon: () => structuredClone(tables.CateringReconciliation[0]), event: () => structuredClone(tables.CateringEvent[0]) };
}

test('partly paid event: advances are applied, the unpaid balance becomes a receivable, posted once', async () => {
  const f = fixture(); await f.receipt(600);
  const r = await postEventRevenue(f.ctx, f.company, f.recon());
  assert.ok(r.posted); assert.equal(r.applied_advance, 600); assert.equal(r.receivable, 400);
  const [j] = f.invoices();
  assert.equal(j.entry_date, '2026-11-11');
  assert.deepEqual(j.lines.map((l) => [l.account_code, l.debit, l.credit]), [['211100', 600, 0], ['111100', 400, 0], ['410300', 0, 1000]]);
  assert.ok(j.lines.every((l) => l.cost_center === 'e1' && l.counterparty_reference === 'c1'));
  assert.ok(j.ledger_ready); assert.equal(f.tables.FinanceLedgerLine.length, 3);
  assert.ok((await postEventRevenue(f.ctx, f.company, f.recon())).already_posted);
  assert.equal(f.invoices().length, 1);
  assert.deepEqual(await f.balances(), { advance: 0, receivable: 40000 });
});

test('a receipt after the invoice settles the receivable; a refund after it re-opens one', async () => {
  const f = fixture(); await f.receipt(600);
  await postEventRevenue(f.ctx, f.company, f.recon());
  const late = await f.receipt(400, '2026-11-12');
  assert.ok((await settleEventReceivable(f.ctx, f.company, f.event(), late)).posted);
  assert.deepEqual(await f.balances(), { advance: 0, receivable: 0 });
  assert.ok((await settleEventReceivable(f.ctx, f.company, f.event(), late)).already_posted);
  const refund = await f.receipt(-150, '2026-11-13');
  assert.ok((await settleEventReceivable(f.ctx, f.company, f.event(), refund)).posted);
  assert.deepEqual(await f.balances(), { advance: 0, receivable: 15000 });
});

test('receipts before the invoice stay customer advances', async () => {
  const f = fixture();
  const early = await f.receipt(300);
  assert.equal(await settleEventReceivable(f.ctx, f.company, f.event(), early), null);
  assert.deepEqual(await f.balances(), { advance: 30000, receivable: 0 });
});

test('an overpaid event keeps the surplus as a customer advance', async () => {
  const f = fixture(); await f.receipt(1200);
  const r = await postEventRevenue(f.ctx, f.company, f.recon());
  assert.equal(r.applied_advance, 1000); assert.equal(r.receivable, 0);
  assert.deepEqual(await f.balances(), { advance: 20000, receivable: 0 });
});

test('exceptions open a Posting Issue instead of being skipped', async () => {
  const taxed = fixture({ tax: 140 }); await taxed.receipt(1000);
  const t = await postEventRevenue(taxed.ctx, taxed.company, taxed.recon());
  assert.ok(t.blocked); assert.match(t.message, /VAT or a service charge/);
  assert.equal(taxed.invoices().length, 0); assert.equal(taxed.tables.FinancePostingIssue.length, 1);

  const unmapped = fixture({ receivable: false }); await unmapped.receipt(600);
  const u = await postEventRevenue(unmapped.ctx, unmapped.company, unmapped.recon());
  assert.ok(u.blocked); assert.match(u.message, /still owes 400/);

  const locked = fixture(); locked.company.closed_through = '2026-11-30'; await locked.receipt(1000);
  assert.match((await postEventRevenue(locked.ctx, locked.company, locked.recon())).message, /locked through/);

  // Once the gap is fixed the same source posts and its issue is resolved.
  unmapped.tables.FinanceAccountBinding.push({ id: 'bind-ar', company_id: 'co', mapping_key: 'CUSTOMER_RECEIVABLE_ACC', account_id: 'ar', priority: 100, effective_from: '2026-01-01', conditions: {}, updated_date: 'v1' });
  assert.ok((await postEventRevenue(unmapped.ctx, unmapped.company, unmapped.recon())).posted);
  assert.equal(unmapped.tables.FinancePostingIssue[0].status, 'resolved');
});

test('a changed final invoice is refused, never posted twice', async () => {
  const f = fixture(); await f.receipt(1000);
  await postEventRevenue(f.ctx, f.company, f.recon());
  f.tables.CateringReconciliation[0].final_billing_total = 1100;
  const r = await postEventRevenue(f.ctx, f.company, f.recon());
  assert.ok(r.blocked); assert.match(r.message, /changed after its revenue was posted/);
  assert.equal(f.invoices().length, 1);
});

test('open reconciliations and companies without revenue mapping are left alone', async () => {
  const open = fixture(); open.tables.CateringReconciliation[0].status = 'open';
  assert.ok((await postEventRevenue(open.ctx, open.company, open.recon())).skipped);
  const unadopted = fixture(); unadopted.tables.FinanceAccountBinding = unadopted.tables.FinanceAccountBinding.filter((b) => b.mapping_key !== 'EVENT_REVENUE_ACC');
  assert.ok((await postEventRevenue(unadopted.ctx, unadopted.company, unadopted.recon())).skipped);
});

test('the customer statement charges the same final invoice the ledger recognizes', () => {
  const quote = { id: 'q1', event_id: 'e1', status: 'accepted', total: 1000, created_date: '2026-11-01' };
  const payments = [{ id: 'p1', event_id: 'e1', client_id: 'c1', status: 'completed', payment_type: 'deposit', amount: 1000, payment_date: '2026-11-02' }];
  const events = [{ id: 'e1', event_name: 'Gala', status: 'completed', active_quote_id: 'q1', branch_id: 'b' }];
  const reconciliations = [{ event_id: 'e1', status: 'finalized', final_billing_total: 1250, finalized_date: '2026-11-11T09:00:00Z' }];
  const account = buildCustomerAccount({ id: 'c1', name: 'Client' }, { quotes: [quote], payments, events, reconciliations });
  assert.equal(account.events[0].debit, 1250); assert.equal(account.balance, 250);
  assert.ok(account.events[0].entries.some((e) => e.kind === 'invoice' && e.debit === 250 && e.date === '2026-11-11'));
  assert.equal(buildCustomerAccount({ id: 'c1' }, { quotes: [quote], payments, events }).balance, 0);
});