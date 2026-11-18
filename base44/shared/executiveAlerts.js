import { readAll, cateringScope, replyHead, round } from './executiveCateringCommon.js';
import { readFilter } from './executiveCateringFilter.js';
import { overduePayments } from './executiveCateringAdvisor.js';
import { onHand } from './executiveSupplyStock.js';
import { supplierInvoicesDue } from './executiveSupplierDue.js';
import { addDays, seesClients } from './executiveCustomers.js';

// Alerts Center: what needs attention today across the modules switched on,
// read from the live records (no period). Fixed checks, so the same records
// always give the same alerts, highest priority first. The dashboard words them.
const RANK = { high: 0, medium: 1, low: 2 };
const BOOKED = ['confirmed', 'in_progress'], OPEN_PO = ['pending', 'confirmed', 'shipped'];
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sum = (rows, f) => round(rows.reduce((s, r) => s + (f(r) || 0), 0));
const top = (rows, pick) => rows.slice(0, 10).map(pick);
const byDate = (rows) => [...rows].sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
const ev = (e) => ({ id: e.id, name: e.event_name || 'Untitled event', date: e.event_date });

async function catering(ctx, { where, today, ...scope }) {
  const E = ctx.svc.entities, soon = addDays(today, 14), week = addDays(today, 7);
  const [past, ahead, payments, toReview] = await Promise.all([
    readAll(E.CateringEvent, { ...where, status: { $in: BOOKED }, event_date: { $lt: today } }),
    readAll(E.CateringEvent, { ...where, status: { $in: BOOKED }, event_date: { $gte: today, $lte: soon } }).then(byDate),
    overduePayments(ctx, { where, today, ...scope }, readFilter({})),
    E.CateringPayment.count({ ...where, status: 'pending' }),
  ]);
  const critical = ahead.filter((e) => n(e.staffing_unfilled_critical_count) > 0);
  const short = ahead.filter((e) => n(e.open_shortfall_count) > 0);
  const gaps = ahead.filter((e) => e.event_date <= week && n(e.staffing_required_count) > n(e.staffing_assigned_count));
  return [
    past.length > 0 && { key: 'events_past_date', priority: 'high', count: past.length, amount: sum(past, (e) => n(e.quote_total)), items: top(byDate(past), ev) },
    payments.length > 0 && { key: 'payments_overdue', priority: 'high', count: payments.length, amount: sum(payments, (e) => e.value), items: top(payments, (e) => ({ id: e.id, name: e.name, date: e.date, amount: e.value, due_by: e.due_by })) },
    critical.length > 0 && { key: 'critical_roles', priority: 'high', count: critical.length, extra: sum(critical, (e) => n(e.staffing_unfilled_critical_count)), items: top(critical, (e) => ({ ...ev(e), count: n(e.staffing_unfilled_critical_count) })) },
    short.length > 0 && { key: 'stock_shortfalls', priority: 'high', count: short.length, extra: sum(short, (e) => n(e.open_shortfall_count)), items: top(short, (e) => ({ ...ev(e), count: n(e.open_shortfall_count) })) },
    gaps.length > 0 && { key: 'staff_gaps', priority: 'medium', count: gaps.length, extra: sum(gaps, (e) => n(e.staffing_required_count) - n(e.staffing_assigned_count)), items: top(gaps, (e) => ({ ...ev(e), count: n(e.staffing_required_count) - n(e.staffing_assigned_count) })) },
    toReview > 0 && { key: 'payments_to_review', priority: 'medium', count: toReview },
  ];
}

async function suppliers(ctx, { where, today }) {
  const due = await supplierInvoicesDue(ctx, where, addDays(today, 7));
  const late = due.filter((d) => d.due < today), soon = due.filter((d) => d.due >= today);
  const item = (d) => ({ id: d.id, name: d.supplier, detail: d.invoice, date: d.due, amount: d.outstanding });
  return [
    late.length > 0 && { key: 'supplier_overdue', priority: 'high', count: late.length, amount: sum(late, (d) => d.outstanding), items: top(late, item) },
    soon.length > 0 && { key: 'supplier_due_soon', priority: 'medium', count: soon.length, amount: sum(soon, (d) => d.outstanding), items: top(soon, item) },
  ];
}

async function purchases(ctx, { where, today }) {
  const E = ctx.svc.entities;
  const [orders, toReview] = await Promise.all([
    readAll(E.PurchaseOrder, { ...where, status: { $in: OPEN_PO } }),
    E.PurchaseOrder.count({ ...where, status: { $in: ['pending_approval', 'recommended'] } }),
  ]);
  const open = orders.filter((o) => !o.purchase_recorded_invoice_id);
  const late = open.filter((o) => o.expected_delivery_date && o.expected_delivery_date < today);
  const forEvents = open.filter((o) => o.order_source === 'catering' && o.needed_by_date && o.needed_by_date <= addDays(today, 3) && !late.includes(o));
  const item = (date) => (o) => ({ id: o.id, name: o.order_number || 'Purchase order', detail: o.supplier || '', date: o[date], amount: n(o.total_amount) });
  return [
    forEvents.length > 0 && { key: 'catering_orders_due', priority: 'high', count: forEvents.length, amount: sum(forEvents, (o) => n(o.total_amount)), items: top(forEvents.sort((a, b) => a.needed_by_date.localeCompare(b.needed_by_date)), item('needed_by_date')) },
    late.length > 0 && { key: 'orders_late', priority: 'medium', count: late.length, amount: sum(late, (o) => n(o.total_amount)), items: top(late.sort((a, b) => a.expected_delivery_date.localeCompare(b.expected_delivery_date)), item('expected_delivery_date')) },
    toReview > 0 && { key: 'orders_to_review', priority: 'medium', count: toReview },
  ];
}

async function inventory(ctx, { where, today, offset }) {
  const stock = await onHand(ctx, where, today, offset), counts = stock.watch.counts;
  const items = (flag) => top(stock.watch.rows.filter((r) => r.flag === flag), (r) => ({ id: r.id, name: r.name, detail: r.branch, date: r.expiry || null, amount: r.value, quantity: r.quantity, unit: r.unit }));
  return [
    counts.expired > 0 && { key: 'stock_expired', priority: 'high', count: counts.expired, amount: stock.figures.expired_value, items: items('expired') },
    counts.expiring > 0 && { key: 'stock_expiring', priority: 'medium', count: counts.expiring, amount: stock.figures.expiring_value, items: items('expiring') },
    counts.out > 0 && { key: 'stock_out', priority: 'medium', count: counts.out, items: items('out') },
    counts.low > 0 && { key: 'stock_low', priority: 'low', count: counts.low, items: items('low') },
  ];
}

// CRM work is for the whole business, as in Client Care; names only for people who see clients.
async function crm(ctx, { today }) {
  const E = ctx.svc.entities, named = seesClients(ctx);
  const [followUps, leads] = await Promise.all([
    readAll(E.ClientInteraction, { follow_up_completed: { $ne: true }, follow_up_date: { $lt: today } }),
    readAll(E.Lead, { status: 'new', created_date: { $lt: new Date(Date.now() - 2 * 86400000).toISOString() } }),
  ]);
  const due = followUps.filter((f) => f.follow_up_date).sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date));
  const waiting = [...leads].sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)));
  return [
    due.length > 0 && { key: 'followups_overdue', priority: 'medium', count: due.length, items: named ? top(due, (f) => ({ id: f.id, name: f.client_name || 'Unnamed client', detail: f.created_by_name || '', date: f.follow_up_date })) : [] },
    waiting.length > 0 && { key: 'leads_waiting', priority: 'medium', count: waiting.length, items: named ? top(waiting, (l) => ({ id: l.id, name: l.sender_name || l.contact_username || l.company || l.lead_number || 'Unnamed lead', detail: l.platform || l.source || '', date: String(l.created_date).slice(0, 10) })) : [] },
  ];
}

async function finance(ctx, { where }) {
  const open = await ctx.svc.entities.FinancePostingIssue.count({ ...where, status: 'open' });
  return [open > 0 && { key: 'posting_issues', priority: 'high', count: open }];
}

const AREAS = [['catering', catering], ['suppliers', suppliers], ['purchases', purchases], ['inventory', inventory], ['crm', crm], ['financial', finance]];

export async function executiveAlerts(ctx, input) {
  const scope = await cateringScope(ctx, { ...input, period: undefined, compare: undefined });
  const seesFinance = !!(ctx.admin || ctx.permissions.financial_view);
  const on = AREAS.filter(([m]) => scope.isOn(m) && (m !== 'financial' || seesFinance));
  const lists = await Promise.all(on.map(([, run]) => run(ctx, scope)));
  const alerts = lists.flat().filter(Boolean)
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || (b.amount ?? 0) - (a.amount ?? 0) || (b.count ?? 0) - (a.count ?? 0));
  return { ...replyHead(scope), available: true, areas: on.map(([m]) => m), alerts };
}