import { readAll, linked, cateringScope, replyHead, num, round } from './executiveCateringCommon.js';
import { postedInvoices, supplierReturns, returnCredit, receivedOrders, deliveryFigures, amount, sum, pct } from './executiveSupplyCommon.js';
import { ledgerBalance } from './executiveSupplyLedger.js';

// Suppliers for the Executive Dashboard. In the period, beside the comparison:
// what was bought from each supplier (purchase invoices posted, by invoice
// date, less the goods returned to it, by return date), how their deliveries
// arrived (orders whose purchase was recorded in
// the period, against the day each was expected, else needed by) and the
// ratings given to them. As of today: what each is owed in the supplier
// accounts, beside the posted ledger's supplier payables.
const average = (list, f) => {
  const values = list.map(f).filter((v) => num(v) !== null && Number(v) > 0);
  return values.length ? round(values.reduce((s, v) => s + Number(v), 0) / values.length) : null;
};

// Ratings given in the window; with a branch selection only those on the branches' orders.
async function reviewed(ctx, where, stamps) {
  const reviews = await readAll(ctx.svc.entities.SupplierReview, { created_date: stamps });
  if (!where.branch_id) return reviews;
  const orders = await linked(ctx.svc.entities.PurchaseOrder, 'id', reviews.map((r) => r.purchase_order_id).filter(Boolean), where);
  const inScope = new Set(orders.map((o) => o.id));
  return reviews.filter((r) => inScope.has(r.purchase_order_id));
}

async function traded(ctx, where, range, stamps, offset) {
  const [invoices, returns, received, reviews] = await Promise.all([postedInvoices(ctx, where, range), supplierReturns(ctx, where, range), receivedOrders(ctx, where, stamps, offset), reviewed(ctx, where, stamps)]);
  return { invoices, returns, received, reviews };
}

// What was bought: invoices posted less the goods returned, per supplier or in all.
const spendOf = ({ invoices, returns }) => {
  const m = invoices.reduce((acc, i) => acc.set(i.supplier_id, (acc.get(i.supplier_id) || 0) + amount(i.total_amount)), new Map());
  returns.forEach((r) => m.set(r.supplier_id, (m.get(r.supplier_id) || 0) - returnCredit(r)));
  return m;
};
const boughtOf = ({ invoices, returns }) => round(sum(invoices, (i) => i.total_amount) - sum(returns, returnCredit));

function totalsOf(set) {
  const spend = spendOf(set), total = boughtOf(set);
  return {
    suppliers_used: [...spend.values()].filter((v) => round(v) > 0).length, purchases_value: total,
    top_supplier_share: pct(Math.max(0, ...spend.values()), total),
    ...deliveryFigures(set.received), supplier_rating: average(set.reviews, (r) => r.overall_rating),
  };
}

// What each supplier is owed: the posted entries of its supplier accounts.
async function owed(ctx, where) {
  const r = await ctx.svc.entities.SupplierLedgerEntry.aggregate({ query: { ...where, status: 'posted' }, groupBy: 'supplier_id', sum: ['delta'], limit: 1000 });
  return new Map(r.rows.map((x) => [x.supplier_id, round(amount(x.sum_delta))]));
}

// Every supplier bought from, delivering, rated or owed money: largest purchases first.
function performance(now, balances, names) {
  const owing = [...balances].filter(([, v]) => v !== 0).map(([id]) => id);
  const ids = new Set([...now.invoices, ...now.returns, ...now.received, ...now.reviews].map((x) => x.supplier_id).concat(owing).filter(Boolean));
  return [...ids].map((id) => {
    const of = (list) => list.filter((x) => x.supplier_id === id), invoices = of(now.invoices), reviews = of(now.reviews);
    return {
      id, name: names.get(id) || 'Unknown supplier', purchases_value: boughtOf({ invoices, returns: of(now.returns) }), invoices: invoices.length,
      ...deliveryFigures(of(now.received)), rating: average(reviews, (r) => r.overall_rating), delivery_rating: average(reviews, (r) => r.delivery_rating),
      quality_rating: average(reviews, (r) => r.quality_rating), reviews: reviews.length, balance: balances.get(id) ?? null,
    };
  }).sort((a, b) => b.purchases_value - a.purchases_value || (b.balance ?? 0) - (a.balance ?? 0));
}

export async function supplySuppliers(ctx, input) {
  const scope = await cateringScope(ctx, input), { period, comparison, stamps, where, offset } = scope;
  if (!scope.isOn('suppliers')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [now, before, balances, suppliers, ledger] = await Promise.all([
    traded(ctx, where, period, stamps.current, offset), traded(ctx, where, comparison, stamps.comparison, offset),
    owed(ctx, where), readAll(ctx.svc.entities.Supplier, {}), ledgerBalance(ctx, input, 'payables'),
  ]);
  const names = new Map(suppliers.map((s) => [s.id, s.name || 'Unnamed supplier']));
  [...now.invoices, ...before.invoices].forEach((i) => names.has(i.supplier_id) || names.set(i.supplier_id, i.supplier_name || 'Unknown supplier'));
  const earlier = before.invoices.length + before.returns.length + before.received.length ? before : null;
  const is = spendOf(now), was = earlier ? spendOf(earlier) : new Map();
  const owedTotal = sum([...balances.values()], (v) => v);
  return {
    ...replyHead(scope), available: true, has_activity: now.invoices.length + now.returns.length + now.received.length + now.reviews.length > 0,
    current: { ...totalsOf(now), supplier_balance: owedTotal }, previous: earlier && totalsOf(earlier),
    spend: [...new Set([...is.keys(), ...was.keys()])].map((id) => ({ key: id, label: names.get(id), current: round(is.get(id) || 0), previous: earlier ? round(was.get(id) || 0) : null })),
    performance: performance(now, balances, names),
    ledger: { ...ledger, operational: owedTotal },
  };
}