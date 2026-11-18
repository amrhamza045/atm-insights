import { readAll, linked, cateringScope, replyHead, segments, num, round } from './executiveCateringCommon.js';
import { normalizeUnit } from './unitConversion.js';
import { postedInvoices, supplierReturns, returnCredit, within, amount, sum, pct, trendOf, partsOf } from './executiveSupplyCommon.js';

// Purchasing for the Executive Dashboard. In the period, beside the
// comparison: the purchase invoices posted (by invoice date), less the goods
// returned to suppliers (by return date), and what they bought per category,
// the purchase orders raised (by order date, cancelled
// ones left out) with the share for catering events and the urgent ones, and
// what price changes since the comparison cost. As of today: the orders still
// open by stage. Every record is read on the server, so totals are never cut off.
const OPEN = [['recommended', 'Recommended, not reviewed'], ['pending_approval', 'Waiting for approval'], ['pending', 'Approved, not bought yet'], ['confirmed', 'Confirmed by the supplier'], ['shipped', 'On the way']];
const SOURCES = [['catering', 'For catering events'], ['regular', 'Regular purchasing']];

const lineOf = (l, invoice) => ({
  item: l.inventory_item_id || '', name: l.inventory_item_name || 'Unnamed item', category: l.category_name || 'Uncategorised',
  unit: l.unit || '', quantity: amount(l.quantity), spend: num(l.total_cost) ?? round(amount(l.quantity) * amount(l.purchase_price)), date: invoice.invoice_date,
});

// Goods sent back to suppliers, as negative purchases on the day of the return,
// under the item, category and unit of the invoice line they came off.
async function returnLines(ctx, returns) {
  const invoices = await linked(ctx.svc.entities.PurchaseInvoice, 'id', returns.map((r) => r.invoice_id).filter(Boolean));
  const byId = new Map(invoices.map((i) => [i.id, i]));
  return returns.flatMap((r) => (r.account_snapshot?.items || []).map((x) => {
    const line = byId.get(r.invoice_id)?.items?.[x.line_index] || {};
    const base = lineOf({ ...line, inventory_item_id: x.inventory_item_id, inventory_item_name: line.inventory_item_name || x.inventory_item_name, unit: x.unit || line.unit }, { invoice_date: r.entry_date });
    return { ...base, quantity: -amount(x.quantity), spend: -amount(x.credit) };
  }));
}

async function bought(ctx, where, range) {
  const [invoices, orders, returns] = await Promise.all([
    postedInvoices(ctx, where, range),
    readAll(ctx.svc.entities.PurchaseOrder, { ...where, status: { $ne: 'cancelled' }, order_date: within(range) }),
    supplierReturns(ctx, where, range),
  ]);
  const lines = invoices.flatMap((i) => (i.items || []).map((l) => lineOf(l, i)));
  return { invoices, orders, returns, lines: lines.concat(await returnLines(ctx, returns)) };
}

// Invoices by invoice date, less the returns by return date.
const flows = (set) => set.invoices.map((i) => ({ date: i.invoice_date, value: amount(i.total_amount) }))
  .concat(set.returns.map((r) => ({ date: r.entry_date, value: -returnCredit(r) })));

function totalsOf({ invoices, orders, returns }) {
  const value = sum(orders, (o) => o.total_amount);
  return {
    purchases_value: round(sum(invoices, (i) => i.total_amount) - sum(returns, returnCredit)), invoices_posted: invoices.length,
    orders_raised: orders.length, orders_value: value,
    catering_order_share: pct(sum(orders.filter((o) => o.order_source === 'catering'), (o) => o.total_amount), value),
    urgent_orders: orders.filter((o) => o.urgency === 'urgent').length,
  };
}

// An item counts as bought while some of what was bought was kept.
const categoryFigures = (lines) => {
  const kept = lines.reduce((m, l) => m.set(l.item || l.name, (m.get(l.item || l.name) || 0) + l.quantity), new Map());
  return { purchases_value: sum(lines, (l) => l.spend), items_bought: [...kept.values()].filter((q) => q > 1e-6).length };
};

// The average price paid per unit of each item bought in both periods (in the
// same unit), and what the change cost on this period's quantity. Largest effect first.
function priceChanges(now, before) {
  // Returns come off the quantity and spend they were bought at; items sent back in full drop out.
  const average = (lines) => new Map([...lines.reduce((m, l) => {
    if (!l.item || !l.quantity) return m;
    const key = `${l.item}|${normalizeUnit(l.unit)}`, p = m.get(key) || { name: l.name, unit: l.unit, quantity: 0, spend: 0 };
    p.quantity += l.quantity; p.spend += l.spend;
    return m.set(key, p);
  }, new Map())].filter(([, p]) => p.quantity > 1e-6));
  const was = average(before);
  return [...average(now)].filter(([key]) => was.has(key)).map(([key, c]) => {
    const p = was.get(key), price = c.spend / c.quantity, old = p.spend / p.quantity;
    return { key, name: c.name, unit: c.unit, quantity: round(c.quantity), price: round(price), previous_price: round(old), change_pct: old > 0 ? round(((price - old) / old) * 100) : null, impact: round((price - old) * c.quantity) };
  }).filter((r) => r.impact !== 0).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

// Orders not yet bought or cancelled: overdue first, then urgent, then by the day they're due.
async function openOrders(ctx, where, today) {
  const rows = await readAll(ctx.svc.entities.PurchaseOrder, { ...where, status: { $in: OPEN.map(([key]) => key) } });
  const open = rows.filter((o) => !o.purchase_recorded_invoice_id).map((o) => {
    const due = o.expected_delivery_date || o.needed_by_date || '';
    return { id: o.id, number: o.order_number || '—', supplier: o.supplier || 'No supplier', status: o.status, due, value: round(amount(o.total_amount)), urgent: o.urgency === 'urgent', overdue: !!due && due < today, catering: o.order_source === 'catering' };
  }).sort((a, b) => b.overdue - a.overdue || b.urgent - a.urgent || (a.due || '9999').localeCompare(b.due || '9999'));
  return {
    value: sum(open, (o) => o.value), count: open.length, overdue: open.filter((o) => o.overdue).length,
    stages: partsOf(open, OPEN, (o) => o.status, (o) => o.value), rows: open.slice(0, 100),
  };
}

export async function supplyPurchasing(ctx, input) {
  const scope = await cateringScope(ctx, input), { period, comparison, where, today } = scope;
  if (!scope.isOn('purchases')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [now, before, open, drafts] = await Promise.all([
    bought(ctx, where, period), bought(ctx, where, comparison), openOrders(ctx, where, today),
    ctx.svc.entities.PurchaseInvoice.aggregate({ query: { ...where, status: 'draft' }, groupBy: 'status', sum: ['total_amount'], limit: 5 }),
  ]);
  const earlier = before.invoices.length + before.orders.length + before.returns.length ? before : null;
  const changes = earlier ? priceChanges(now.lines, earlier.lines) : [];
  return {
    ...replyHead(scope), available: true, has_activity: now.invoices.length + now.orders.length + now.returns.length > 0,
    current: { ...totalsOf(now), price_change_impact: earlier ? sum(changes, (c) => c.impact) : null, open_orders_value: open.value },
    previous: earlier && totalsOf(earlier),
    trend: trendOf(scope, flows(now), earlier && flows(earlier), (f) => f.date, (f) => f.value),
    by_category: segments(now.lines, earlier && earlier.lines, 'category', categoryFigures, 'purchases_value'),
    sources: partsOf(now.orders, SOURCES, (o) => (o.order_source === 'catering' ? 'catering' : 'regular'), (o) => o.total_amount),
    price_changes: changes.slice(0, 100),
    open,
    drafts: { count: sum(drafts.rows, (r) => r.count), value: sum(drafts.rows, (r) => r.sum_total_amount) },
  };
}