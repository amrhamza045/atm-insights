import { requireValue, validateLines } from './financeValidation.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';
import { branchQuery } from './financeAccess.js';
import { inventoryDate } from './inventoryAccountingContext.js';

export const OPENING_EQUITY_KEY = 'OPENING_BALANCE_EQUITY_ACCOUNT';
export const ADVANCE_KEY = 'CUSTOMER_ADVANCE_ACC';
export const PAYABLE_KEY = 'VENDOR_AP_ACCOUNT';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// The first opening entry fixes the company cut-off; every later entry uses it.
export async function openingCutoff(ctx, company) {
  const page = await ctx.svc.entities.FinanceOpeningBalance.filter({ company_id: company.id }, { sort: 'created_date', limit: 1 });
  return page.items[0]?.cutoff_date || '';
}

export async function chooseCutoff(ctx, company, requested) {
  const fixed = await openingCutoff(ctx, company);
  if (fixed) {
    requireValue(!requested || requested === fixed, `Opening balances use the company cut-off ${fixed}.`);
    return { cutoff: fixed, first: false };
  }
  requireValue(DAY.test(requested || '') && !Number.isNaN(Date.parse(requested)), 'Enter the opening cut-off date.');
  requireValue(requested <= await inventoryDate(ctx.svc.entities), 'The cut-off cannot be in the future.');
  return { cutoff: requested, first: true };
}

// The opening equity mapping has no start date of its own: it starts on the cut-off.
// The first opening entry moves every current mapping to the cut-off; later entries only
// move a mapping that starts after it when nothing else covers the cut-off.
export async function alignOpeningEquity(ctx, company, cutoff, first) {
  const db = ctx.svc.entities;
  const page = await db.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: OPENING_EQUITY_KEY }, { limit: 50 });
  requireValue(page.items.length && !page.has_more, 'Map Opening balance equity in Finance › Mapping Accounts before posting opening balances.');
  const rule = (b) => JSON.stringify(b.conditions || {});
  const covers = (b) => b.effective_from <= cutoff && (!b.effective_to || b.effective_to >= cutoff);
  for (const b of page.items) {
    if (b.effective_to || b.effective_from === cutoff) continue;
    const move = b.effective_from > cutoff ? !page.items.some((o) => o.id !== b.id && rule(o) === rule(b) && covers(o)) : first;
    if (move) Object.assign(b, { effective_from: cutoff }, await db.FinanceAccountBinding.update(b.id, { effective_from: cutoff }));
  }
  return page.items;
}

// One journal per entry, dated on the cut-off. A retry reuses the posting key and stops
// if the checked accounts changed since the entry was started.
export async function postOpeningJournal(ctx, company, entry, label) {
  const db = ctx.svc.entities, key = `${company.id}:opening:${entry.entry_key}`;
  const page = await db.FinanceJournal.filter({ company_id: company.id, posting_key: key }, { limit: 2 });
  requireValue(page.items.length <= 1 && !page.has_more, 'Duplicate opening journals require review.', 409);
  let journal = page.items[0];
  if (!journal) {
    const plan = entry.account_snapshot;
    openFinanceDate(company, entry.cutoff_date);
    const lines = await checkedAccounts(ctx, company, plan.raw, entry.cutoff_date);
    requireValue(JSON.stringify(lines) === JSON.stringify(plan.lines), 'Account definitions changed; review the pending opening entry.', 409);
    journal = await db.FinanceJournal.create({
      company_id: company.id, branch_id: entry.branch_id, posting_key: key, proposal_id: `opening:${entry.id}`, status: 'posted', kind: 'opening',
      entry_date: entry.cutoff_date, description: `Opening balance · ${label}`, currency: company.currency, business_edition: company.edition,
      source_entity: 'FinanceOpeningBalance', source_id: entry.id, source_version: entry.updated_date,
      source_summary: { opening_kind: entry.kind, cutoff_date: entry.cutoff_date, mapping_bindings: plan.mapping_bindings },
      lines, ...validateLines(lines, company.currency_decimals), prepared_by: entry.actor_email, prepared_by_id: ctx.user.id,
      reviewed_by: ctx.user.email, reviewed_by_id: ctx.user.id, reviewed_at: new Date().toISOString(),
      review_note: 'Opening balance at the company cut-off, entered with its evidence reference.', rule_version: 'opening-v1',
      evidence_note: entry.notes, is_test: !!company.is_test, ledger_ready: false,
    });
  }
  await projectFinanceJournal(ctx, company, journal);
  return db.FinanceOpeningBalance.update(entry.id, { status: 'posted', journal_id: journal.id });
}

// One entry per key. A pending entry resumes only with the same values; a posted one is final.
export async function findOpening(db, company, entry_key, same) {
  const found = await db.FinanceOpeningBalance.filter({ company_id: company.id, entry_key }, { limit: 2 });
  requireValue(found.items.length <= 1, 'Duplicate opening entries require review.', 409);
  const entry = found.items[0];
  if (entry) {
    requireValue(entry.status === 'pending', 'This opening balance is already posted. Opening balances are never overwritten; correct it with a journal.', 409);
    requireValue(same(entry), 'An unfinished opening entry with other values exists. Retry with the same values.', 409);
  }
  return entry || null;
}

// Checks the planned lines on the cut-off; the last line is always the opening equity side.
export async function openingLines(ctx, company, raw, cutoff) {
  openFinanceDate(company, cutoff);
  const lines = await checkedAccounts(ctx, company, raw, cutoff);
  requireValue(lines.at(-1).management_mapping === 'equity', 'Opening balance equity must map to an equity account.');
  validateLines(lines, company.currency_decimals);
  return lines;
}

// Every active supplier: the balance reported on its record from before the ledger, the
// opening in its supplier account (per branch), and the invoices already in the system
// (the opening must be dated before the first). Openings still to enter come first.
async function supplierRows(ctx, company) {
  const db = ctx.svc.entities, scope = { company_id: company.id, ...branchQuery(ctx, company) };
  const [suppliers, openings, invoices] = await Promise.all([
    db.Supplier.filter({ is_active: { $ne: false } }, { sort: 'name', limit: 500 }),
    db.SupplierLedgerEntry.filter({ ...scope, kind: 'opening' }, { limit: 500 }),
    db.SupplierLedgerEntry.filter({ ...scope, kind: 'invoice' }, { sort: 'entry_date', limit: 1000 }),
  ]);
  const rows = suppliers.items.map((s) => {
    const ledger = {};
    for (const i of invoices.items.filter((x) => x.supplier_id === s.id)) {
      const l = ledger[i.branch_id] || (ledger[i.branch_id] = { first: i.entry_date, invoiced: 0 });
      l.invoiced = Math.round((l.invoiced + (Number(i.delta) || 0)) * 100) / 100;
    }
    const mine = openings.items.filter((o) => o.supplier_id === s.id).map((o) => ({ branch_id: o.branch_id, amount: o.delta, entry_date: o.entry_date, status: o.status, notes: o.notes, offset_account_id: o.account_snapshot?.offset_account_id || '', already_in_gl: !!o.account_snapshot?.already_in_gl }));
    return { supplier_id: s.id, supplier_name: s.name, reported: Number(s.total_outstanding) || 0, openings: mine, ledger };
  });
  const todo = (r) => Number(r.reported > 0 && !r.openings.length);
  return rows.sort((a, b) => todo(b) - todo(a) || String(a.supplier_name).localeCompare(String(b.supplier_name)));
}

// Open events after the cut-off: a client advance paid before it is entered on one of these.
async function advanceEvents(ctx, company, cutoff) {
  const page = await ctx.svc.entities.CateringEvent.filter({ ...branchQuery(ctx, company), status: { $nin: ['cancelled', 'completed'] }, ...(cutoff ? { event_date: { $gt: cutoff } } : {}) }, { sort: 'event_date', limit: 200 });
  return page.items.filter((e) => e.client_id).map(({ id, event_name, event_date, client_name, branch_name, quote_total, total_paid }) => ({ id, event_name, event_date, client_name, branch_name, quote_total, total_paid }));
}

export async function readOpenings(ctx, company) {
  const db = ctx.svc.entities, cutoff = await openingCutoff(ctx, company);
  const [entries, methods, bindings, suppliers, events] = await Promise.all([
    db.FinanceOpeningBalance.filter({ company_id: company.id, ...branchQuery(ctx, company) }, { sort: '-created_date', limit: 200 }),
    db.FinancePaymentMethod.filter({ company_id: company.id, is_active: true }, { sort: 'name', limit: 100 }),
    db.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: { $in: [OPENING_EQUITY_KEY, ADVANCE_KEY, PAYABLE_KEY] } }, { limit: 150 }),
    supplierRows(ctx, company),
    advanceEvents(ctx, company, cutoff),
  ]);
  const current = (key) => bindings.items.filter((b) => b.mapping_key === key && !b.effective_to).map(({ id, account_id, account_code, account_name, effective_from }) => ({ id, account_id, account_code, account_name, effective_from }));
  return {
    cutoff, suppliers, events,
    entries: entries.items.map(({ account_snapshot, ...e }) => e),
    methods: methods.items.map(({ id, code, name, account_code, account_name }) => ({ id, code, name, account_code, account_name })),
    equity: current(OPENING_EQUITY_KEY),
    accounts: { advance: current(ADVANCE_KEY)[0] || null, payable: current(PAYABLE_KEY)[0] || null },
  };
}