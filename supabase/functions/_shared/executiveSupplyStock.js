import { readAll, cateringScope, replyHead, segments, round } from './executiveCateringCommon.js';
import { companyDay } from './companyTimezone.js';
import { loadConversionRules, computeIngredientCost, getItemStockUnit } from './unitConversion.js';
import { within, amount, sum, pct, trendOf, partsOf } from './executiveSupplyCommon.js';
import { ledgerBalance } from './executiveSupplyLedger.js';

// Stock & Waste for the Executive Dashboard. As of today: what the stock items
// of the picker's branches are worth (quantity on hand × cost, converted from
// the unit the cost is kept in), what is expired, expiring within a week, low
// or out, and the posted ledger's stock accounts beside that value. In the
// period, beside the comparison: the approved waste declarations by waste
// date, their cost and its share of the purchases (invoices posted less goods
// returned to suppliers). Every record is read on the server, so totals are
// never cut off.
const REASONS = [['expired', 'Expired'], ['spoiled', 'Spoiled'], ['damaged', 'Damaged'], ['overproduction', 'Overproduction'], ['preparation_error', 'Preparation error'], ['other', 'Other']];
const FLAGS = ['expired', 'expiring', 'low', 'out'];

function valued(item, rules) {
  const quantity = amount(item.quantity), unit = getItemStockUnit(item);
  const cost = quantity > 0 ? computeIngredientCost(quantity, unit, item, rules) : { ok: true, totalCost: 0 };
  return {
    id: item.id, name: item.name || 'Unnamed item', branch: item.branch_name || '', category: item.category_name || 'Uncategorised',
    quantity, unit, threshold: amount(item.low_stock_threshold), expiry: item.expiry_date || '', value: cost.ok ? round(cost.totalCost) : null,
  };
}

// What needs attention first: expired, expiring within the week, low, out of stock.
function flagOf(r, today, soon) {
  if (r.quantity > 0 && r.expiry && r.expiry < today) return 'expired';
  if (r.quantity > 0 && r.expiry && r.expiry <= soon) return 'expiring';
  if (r.quantity <= 0) return 'out';
  return r.threshold > 0 && r.quantity <= r.threshold ? 'low' : null;
}

export async function onHand(ctx, where, today, offset) {
  const [items, rules] = await Promise.all([readAll(ctx.svc.entities.InventoryItem, where), loadConversionRules(ctx.svc.entities)]);
  const soon = companyDay(offset, 7);
  const rows = items.map((i) => { const r = valued(i, rules); return { ...r, flag: flagOf(r, today, soon) }; });
  const flagged = (f) => rows.filter((r) => r.flag === f).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const byCategory = rows.reduce((m, r) => m.set(r.category, (m.get(r.category) || 0) + (r.value || 0)), new Map());
  const watch = FLAGS.flatMap((f) => flagged(f));
  return {
    figures: {
      stock_value: sum(rows, (r) => r.value), expiring_value: sum(flagged('expiring'), (r) => r.value), expired_value: sum(flagged('expired'), (r) => r.value),
      low_stock_items: flagged('low').length, out_of_stock_items: flagged('out').length,
    },
    items_in_stock: rows.filter((r) => r.quantity > 0).length,
    uncosted: rows.filter((r) => r.value === null).length,
    by_category: [...byCategory].filter(([, v]) => v > 0).map(([key, v]) => ({ key, label: key, current: round(v), previous: null })),
    watch: { counts: Object.fromEntries(FLAGS.map((f) => [f, flagged(f).length])), total: watch.length, rows: watch.slice(0, 100) },
  };
}

const REASON_KEYS = REASONS.map(([key]) => key);
async function wasted(ctx, where, range) {
  // Food tastings are logged on the waste screen but are not waste.
  const rows = await readAll(ctx.svc.entities.WasteDeclaration, { ...where, status: 'approved', is_tasting: { $ne: true }, waste_date: within(range) });
  return rows.map((w) => ({
    key: w.inventory_item_id || w.inventory_item_name || 'unknown', name: w.inventory_item_name || 'Unnamed item',
    category: w.category_name || 'Uncategorised', reason: REASON_KEYS.includes(w.reason) ? w.reason : 'other',
    date: w.waste_date, value: round(amount(w.cost_impact)), catering: !!w.event_id,
  }));
}

// Invoices posted in the range, less the goods returned to suppliers (a return's delta is negative).
async function purchased(ctx, where, range) {
  const [bought, returned] = await Promise.all([
    ctx.svc.entities.PurchaseInvoice.aggregate({ query: { ...where, status: { $ne: 'draft' }, invoice_date: within(range) }, groupBy: 'status', sum: ['total_amount'], limit: 10 }),
    ctx.svc.entities.SupplierLedgerEntry.aggregate({ query: { ...where, kind: 'supplier_return', status: 'posted', entry_date: within(range) }, groupBy: 'kind', sum: ['delta'], limit: 5 }),
  ]);
  return round(sum(bought.rows, (x) => x.sum_total_amount) + sum(returned.rows, (x) => x.sum_delta));
}

const wasteFigures = (list) => ({ waste_declarations: list.length, waste_value: sum(list, (w) => w.value) });
const wasteTotals = (list, bought) => ({
  ...wasteFigures(list),
  catering_waste_value: sum(list.filter((w) => w.catering), (w) => w.value),
  waste_pct_purchases: pct(sum(list, (w) => w.value), bought),
});

export async function supplyStock(ctx, input) {
  const scope = await cateringScope(ctx, input), { period, comparison, where, today, offset } = scope;
  if (!scope.isOn('inventory')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const pending = ctx.svc.entities.WasteDeclaration.aggregate({ query: { ...where, status: 'pending', is_tasting: { $ne: true } }, groupBy: 'status', sum: ['cost_impact'], limit: 5 });
  const [stock, now, before, boughtNow, boughtBefore, waiting, ledger] = await Promise.all([
    onHand(ctx, where, today, offset), wasted(ctx, where, period), wasted(ctx, where, comparison),
    purchased(ctx, where, period), purchased(ctx, where, comparison), pending, ledgerBalance(ctx, input, 'stock'),
  ]);
  // Without waste or purchases in the comparison period there's nothing to compare with.
  const earlier = before.length || boughtBefore > 0 ? before : null;
  const names = Object.fromEntries([...now, ...(earlier || [])].map((w) => [w.key, w.name]));
  return {
    ...replyHead(scope), available: true, has_activity: now.length > 0,
    current: { ...stock.figures, ...wasteTotals(now, boughtNow) }, previous: earlier && wasteTotals(earlier, boughtBefore),
    items_in_stock: stock.items_in_stock, uncosted: stock.uncosted,
    pending_waste: { count: sum(waiting.rows, (r) => r.count), value: sum(waiting.rows, (r) => r.sum_cost_impact) },
    trend: trendOf(scope, now, earlier, (w) => w.date, (w) => w.value),
    reasons: partsOf(now, REASONS, (w) => w.reason, (w) => w.value),
    by_item: segments(now, earlier, 'key', wasteFigures, 'waste_value', names),
    by_category: segments(now, earlier, 'category', wasteFigures, 'waste_value'),
    stock_by_category: stock.by_category,
    watch: stock.watch,
    ledger: { ...ledger, operational: stock.figures.stock_value },
  };
}