// Branch-scoped supplier totals from the posted supplier ledger, using the same
// definition as Finance › Our Suppliers: spent = posted invoices - posted
// supplier returns, paid = cash settlements + legacy standalone payments,
// remaining = spent - paid.
import { supplierEntries } from './supplierAccountsAccess.js';
import { supplierSpend } from './supplierSpend.js';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const PAID_KINDS = ['payment', 'historical_settlement'];

const byGroup = (rows, key, field) => {
  const map = {};
  for (const row of rows || []) map[row[key]] = (map[row[key]] || 0) + Number(row[field] || 0);
  return map;
};

export async function supplierTotals(svc, branchId) {
  const ledger = svc.entities.SupplierLedgerEntry;
  const [ledgerRows, legacyRows] = await Promise.all([
    ledger.aggregate({ query: { branch_id: branchId, status: 'posted' }, groupBy: ['supplier_id', 'kind'], sum: ['delta'] }),
    svc.entities.SupplierPayment.aggregate({ query: { branch_id: branchId, status: { $exists: false } }, groupBy: 'supplier_id', sum: ['amount'] }),
  ]);
  const spend = supplierSpend(ledgerRows.rows);
  const legacy = byGroup(legacyRows.rows, 'supplier_id', 'sum_amount');
  const ids = new Set([...spend.keys(), ...Object.keys(legacy)]);
  const totals = {};
  for (const id of ids) {
    const t = spend.get(id);
    const s = t?.total_spent || 0;
    const p = r2((t?.total_payments || 0) + (legacy[id] || 0));
    totals[id] = { spent: s, paid: p, remaining: r2(Math.max(0, s - p)) };
  }
  return totals;
}

// Registered invoices that still carry an open balance, oldest first.
export async function payableInvoices(ctx) {
  const e = supplierEntries(ctx);
  const [sums, charges] = await Promise.all([
    e.aggregate({ query: { ...ctx.query, status: 'posted', invoice_id: { $nin: ['', null] } }, groupBy: 'invoice_id', sum: ['delta'] }),
    e.filter({ ...ctx.query, kind: 'invoice', status: 'posted' }, { sort: 'entry_date', limit: 500 }),
  ]);
  const open = byGroup(sums.rows, 'invoice_id', 'sum_delta');
  return charges.items
    .map((c) => ({ invoice_id: c.invoice_id, invoice_number: c.invoice_number, outstanding: r2(open[c.invoice_id]) }))
    .filter((i) => i.outstanding > 0);
}

export function allocate(invoices, amount) {
  let left = r2(amount);
  const out = [];
  for (const inv of invoices) {
    if (left <= 0) break;
    const take = r2(Math.min(left, inv.outstanding));
    out.push({ invoice_id: inv.invoice_id, invoice_number: inv.invoice_number, amount: take });
    left = r2(left - take);
  }
  return out;
}

// Deterministic v4-shaped key so a retried payment reuses the same ledger rows.
export async function allocationKey(base, invoiceId) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${base}:${invoiceId}`)));
  h[6] = (h[6] & 0x0f) | 0x40;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

export async function supplierPaymentHistory(svc, branchId, supplierId) {
  const scope = { branch_id: branchId, supplier_id: supplierId };
  const [ledger, records] = await Promise.all([
    svc.entities.SupplierLedgerEntry.filter({ ...scope, status: 'posted', kind: { $in: PAID_KINDS } }, { sort: '-entry_date', limit: 200 }),
    svc.entities.SupplierPayment.filter(scope, { sort: '-created_date', limit: 200 }),
  ]);
  const linked = new Set(records.items.flatMap((p) => p.ledger_entry_ids || []));
  const fromPay = records.items.filter((p) => p.status !== 'pending').map((p) => ({
    id: p.id, source: p.status ? 'supplier_pay' : 'legacy', amount: p.amount, payment_date: p.payment_date,
    payment_method_name: p.payment_method_name || '', settlement: p.settlement || '', notes: p.notes || '',
    invoice_numbers: (p.allocations || []).map((a) => a.invoice_number).filter(Boolean),
    recorded_by: p.recorded_by_name || p.recorded_by_email || '',
    confirmation_file_uri: p.confirmation_file_uri || '', confirmation_file_name: p.confirmation_file_name || '',
  }));
  const fromInvoices = ledger.items.filter((l) => !linked.has(l.id)).map((l) => ({
    id: l.id, source: l.kind === 'historical_settlement' ? 'historical' : 'invoice', amount: r2(-l.delta), payment_date: l.entry_date,
    payment_method_name: l.payment_method_name || '', notes: l.notes || '', invoice_numbers: l.invoice_number ? [l.invoice_number] : [],
    recorded_by: l.actor_email || '',
  }));
  return [...fromPay, ...fromInvoices].sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date)));
}