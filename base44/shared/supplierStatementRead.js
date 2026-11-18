import { readAll } from './executiveCateringCommon.js';
import { supplierSpend, EMPTY_SPEND } from './supplierSpend.js';
import { sortRows } from './reportSort.js';

// Finance › Our Suppliers. Suppliers are a shared pool, but every figure is
// strictly scoped to the selected branch (or all branches of the selected
// company) and dates. Account figures come from posted supplier-ledger entries:
// invoices and openings are owed (credit); payments, settlements and returns
// are debits. The Purchases check lists invoices recorded in Purchases in the
// same scope that were never posted to the supplier account (invoices dated on
// or before a posted opening balance are covered by it).
const r2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
const KIND = { invoice: 'Invoice', opening: 'Opening balance', payment: 'Payment', historical_settlement: 'Historical settlement', supplier_return: 'Supplier return' };
const COLUMNS = {
  name: (r) => r.supplier_name, invoices: (r) => r.total_invoices, returns: (r) => r.total_returns, spent: (r) => r.total_spent,
  payments: (r) => r.total_payments, balance: (r) => r.balance, unposted: (r) => r.unposted_amount,
};

const dayRange = (from, to) => (from || to ? { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } : null);
export function entryQuery({ companyId, branchIds, from, to }) {
  const q = { company_id: companyId, branch_id: { $in: branchIds }, status: 'posted' };
  const range = dayRange(from, to);
  return range ? { ...q, entry_date: range } : q;
}

// Purchases invoices in scope with no posted ledger invoice, per supplier.
async function unpostedInvoices(svc, scope) {
  const ledgerBase = { company_id: scope.companyId, branch_id: { $in: scope.branchIds }, status: 'posted' };
  const range = dayRange(scope.from, scope.to);
  const [invoices, charges, openings] = await Promise.all([
    readAll(svc.entities.PurchaseInvoice, { branch_id: { $in: scope.branchIds }, status: { $ne: 'draft' }, ...(range ? { invoice_date: range } : {}) }),
    readAll(svc.entities.SupplierLedgerEntry, { ...ledgerBase, kind: 'invoice' }),
    readAll(svc.entities.SupplierLedgerEntry, { ...ledgerBase, kind: 'opening' }),
  ]);
  const posted = new Set(charges.map((c) => c.invoice_id).filter(Boolean));
  const openedAt = new Map();
  for (const o of openings) { const k = `${o.supplier_id}|${o.branch_id}`; if (!openedAt.has(k) || o.entry_date > openedAt.get(k)) openedAt.set(k, o.entry_date); }
  const out = new Map();
  for (const i of invoices) {
    const cover = openedAt.get(`${i.supplier_id}|${i.branch_id}`);
    if (posted.has(i.id) || (cover && i.invoice_date <= cover)) continue;
    if (!out.has(i.supplier_id)) out.set(i.supplier_id, []);
    out.get(i.supplier_id).push({ invoice_number: i.invoice_number, invoice_date: i.invoice_date, branch_name: i.branch_name || '', amount: r2(i.total_amount) });
  }
  return out;
}

export async function supplierRows(svc, scope) {
  const [sums, unposted, suppliers] = await Promise.all([
    svc.entities.SupplierLedgerEntry.aggregate({ query: entryQuery(scope), groupBy: ['supplier_id', 'kind'], sum: ['delta'] }),
    unpostedInvoices(svc, scope), readAll(svc.entities.Supplier, {}),
  ]);
  if (sums.truncated) throw Object.assign(new Error('Too many suppliers to total; narrow the filters.'), { status: 400 });
  const spend = supplierSpend(sums.rows);
  const term = (scope.search || '').trim().toLowerCase();
  return suppliers
    .filter((s) => !term || [s.name, s.phone, s.email, s.contact_person].filter(Boolean).join(' ').toLowerCase().includes(term))
    .filter((s) => !scope.supplierIds || scope.supplierIds.includes(s.id))
    .map((s) => {
      const missing = unposted.get(s.id) || [];
      return {
        supplier_id: s.id, supplier_name: s.name || 'Unnamed supplier', phone: s.phone || '', email: s.email || '', is_active: s.is_active !== false,
        ...(spend.get(s.id) || EMPTY_SPEND),
        unposted_count: missing.length, unposted_amount: r2(missing.reduce((t, i) => t + i.amount, 0)), unposted: missing,
      };
    });
}

export const keepRow = (r, { balanceOnly, mismatchOnly }) => (!balanceOnly || Math.abs(r.balance) >= 0.01) && (!mismatchOnly || r.unposted_count > 0);

export function supplierPage(rows, { page = 1, pageSize = 20, sort = 'balance', dir, ...opts }) {
  const list = sortRows(rows.filter((r) => keepRow(r, opts)), COLUMNS, { sort, dir }, 'balance', (r) => r.supplier_name);
  const size = Math.min(Math.max(Number(pageSize) || 20, 5), 100), pages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(Number(page) || 1, 1), pages);
  const sum = (k) => r2(list.reduce((s, r) => s + r[k], 0));
  const totals = { total_invoices: sum('total_invoices'), total_returns: sum('total_returns'), total_spent: sum('total_spent'), total_payments: sum('total_payments'), balance: sum('balance'), unposted_amount: sum('unposted_amount'), unposted_count: sum('unposted_count'), mismatches: list.filter((r) => r.unposted_count > 0).length };
  const items = list.slice((current - 1) * size, current * size).map(({ unposted, ...r }) => r);
  return { items, totals, count: list.length, page: current, pages, page_size: size };
}

// Dated ledger entries per supplier in the scope, oldest first.
export async function supplierEntries(svc, scope, supplierIds) {
  const rows = await readAll(svc.entities.SupplierLedgerEntry, { ...entryQuery(scope), supplier_id: { $in: supplierIds } });
  const out = new Map(supplierIds.map((id) => [id, []]));
  rows.sort((a, b) => `${a.entry_date}${a.created_date}`.localeCompare(`${b.entry_date}${b.created_date}`));
  for (const e of rows) {
    const d = Number(e.delta) || 0;
    out.get(e.supplier_id)?.push({
      date: e.entry_date, kind: e.kind,
      label: [KIND[e.kind] || e.kind, e.invoice_number && `#${e.invoice_number}`].filter(Boolean).join(' '),
      reference: [e.payment_method_name || e.payment_method, e.notes].filter(Boolean).join(' · '),
      invoice: d > 0 ? r2(d) : 0, payment: d < 0 ? r2(-d) : 0,
    });
  }
  return out;
}