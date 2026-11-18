import { readAll, num, round } from './executiveCateringCommon.js';
import { rangeBuckets, dayCount } from './executivePeriod.js';
import { dayInOffset } from './companyTimezone.js';

// What the Executive Dashboard cost & supply reports share: inclusive date
// ranges, totals and shares, the purchase invoices posted in a range and the
// goods returned to suppliers, when each received order arrived, and figures
// per day or month or per named part.
export const within = (range) => ({ $gte: range.from, $lte: range.to });
export const amount = (v) => num(v) ?? 0;
export const sum = (rows, f) => round(rows.reduce((s, r) => s + (Number(f(r)) || 0), 0));
export const pct = (part, whole) => (whole > 0 ? round((part / whole) * 100) : null);

// Invoices dated in the range that moved stock: posted ones, and older ones
// saved before invoices had a status. Drafts don't count.
export const postedInvoices = (ctx, where, range) =>
  readAll(ctx.svc.entities.PurchaseInvoice, { ...where, status: { $ne: 'draft' }, invoice_date: within(range) });

// Goods sent back to suppliers in the range: the posted supplier returns, by
// return date. A return's credit is what it takes off the purchases.
export const supplierReturns = (ctx, where, range) =>
  readAll(ctx.svc.entities.SupplierLedgerEntry, { ...where, kind: 'supplier_return', status: 'posted', entry_date: within(range) });
export const returnCredit = (r) => -amount(r.delta);

// Orders whose real purchase was recorded in a time window (stamps): the
// company day each arrived, the days it took from its order date, and whether
// it came by the day it was expected (else needed by); null without such a day.
export async function receivedOrders(ctx, where, stamps, offset) {
  const orders = await readAll(ctx.svc.entities.PurchaseOrder, { ...where, purchase_recorded_at: stamps });
  return orders.map((o) => {
    const day = dayInOffset(o.purchase_recorded_at, offset), due = o.expected_delivery_date || o.needed_by_date || '';
    return { supplier_id: o.supplier_id || '', day, lead_days: o.order_date ? Math.max(0, dayCount(o.order_date, day) - 1) : null, on_time: due ? day <= due : null };
  });
}

export function deliveryFigures(list) {
  const timed = list.filter((o) => o.lead_days !== null), dated = list.filter((o) => o.on_time !== null);
  return {
    deliveries_received: list.length,
    avg_lead_days: timed.length ? round(timed.reduce((s, o) => s + o.lead_days, 0) / timed.length) : null,
    on_time_rate: pct(dated.filter((o) => o.on_time).length, dated.length),
  };
}

// A figure per day or month of the period, beside the comparison's bucket at
// the same place (null without a comparison): valueOf added up, or total(rows)
// for a figure that isn't a sum (a share).
export function trendOf(scope, list, earlier, dateOf, valueOf, total = (rows) => sum(rows, valueOf)) {
  const cells = (rows, range) => rangeBuckets(range, scope.unit).map((b) => total(rows.filter((r) => dateOf(r) >= b.from && dateOf(r) <= b.to)));
  const now = cells(list, scope.period), prior = earlier ? cells(earlier, scope.comparison) : [];
  return rangeBuckets(scope.period, scope.unit).map((b, i) => ({ from: b.from, current: now[i], previous: earlier ? prior[i] ?? null : null }));
}

// A list split into named parts: [{ key, label, count, value }].
export const partsOf = (list, labels, keyOf, valueOf) => labels.map(([key, label]) => {
  const own = list.filter((r) => keyOf(r) === key);
  return { key, label, count: own.length, value: sum(own, valueOf) };
});