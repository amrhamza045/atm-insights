// One definition of supplier totals for every screen, from posted supplier-ledger
// sums grouped by supplier and kind:
//   invoices = posted invoices + opening balances (owed)
//   returns  = posted supplier-return credits
//   spent    = invoices - returns
//   payments = cash settlements (payments + historical settlements), never returns
//   balance  = spent - payments
const r2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
const INVOICE = new Set(['invoice', 'opening']);
const PAYMENT = new Set(['payment', 'historical_settlement']);

export const EMPTY_SPEND = { total_invoices: 0, total_returns: 0, total_spent: 0, total_payments: 0, balance: 0 };

export function supplierSpend(rows) {
  const acc = new Map();
  for (const x of rows || []) {
    const t = acc.get(x.supplier_id) || { inv: 0, ret: 0, pay: 0 };
    const d = Number(x.sum_delta) || 0;
    if (INVOICE.has(x.kind)) t.inv += d;
    else if (x.kind === 'supplier_return') t.ret -= d;
    else if (PAYMENT.has(x.kind)) t.pay -= d;
    acc.set(x.supplier_id, t);
  }
  const out = new Map();
  for (const [id, t] of acc) {
    const spent = r2(t.inv - t.ret);
    out.set(id, { total_invoices: r2(t.inv), total_returns: r2(t.ret), total_spent: spent, total_payments: r2(t.pay), balance: r2(spent - t.pay) });
  }
  return out;
}