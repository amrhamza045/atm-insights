import { readAll, linked, cateringScope, replyHead, segments, num, round } from './executiveCateringCommon.js';
import { rangeBuckets } from './executivePeriod.js';
import { readFilter, filterEvents } from './executiveCateringFilter.js';

// Event P&L for the Executive Dashboard: the delivered events (status
// Completed, by event date) of the picker's branches at their final bills and
// recorded actual costs, beside the comparison period. Every record is read
// on the server, so totals are never cut off.
const VENUES = { on_site: 'On-site', off_site: 'Off-site' };

async function delivered(ctx, where, range, filter) {
  const E = ctx.svc.entities;
  return priced(ctx, await filterEvents(ctx, await readAll(E.CateringEvent, { ...where, status: 'completed', event_date: { $gte: range.from, $lte: range.to } }), filter));
}

// Delivered events at their final bills and recorded actual costs.
export async function priced(ctx, events) {
  const E = ctx.svc.entities, bills = new Map();
  for (const r of await linked(E.CateringReconciliation, 'event_id', events.map((e) => e.id), { status: 'finalized' })) bills.set(r.event_id, r);
  const quoteOf = (e) => bills.get(e.id)?.quote_id || e.active_quote_id;
  const quotes = new Map((await linked(E.CateringQuote, 'id', events.map(quoteOf).filter(Boolean))).map((q) => [q.id, q]));
  return events.map((event) => figures(event, bills.get(event.id), quotes.get(quoteOf(event))));
}

function figures(event, bill, quote) {
  const revenue = num(event.actual_revenue) ?? num(bill?.final_billing_total);
  const food = num(event.actual_food_cost) ?? 0, labour = num(event.actual_labor_cost) ?? 0, equipment = num(event.actual_equipment_cost) ?? 0;
  const cost = num(event.actual_total_cost) ?? round(food + labour + equipment);
  const margin = revenue === null ? null : round(revenue - cost);
  return {
    id: event.id, name: event.event_name || 'Untitled event', date: event.event_date, client: event.client_name || 'No client name', client_id: event.client_id || '',
    event_type: event.event_type || 'Unspecified', package_name: quote?.package_name || 'Manual / Custom',
    venue_type: event.location_type === 'off_site' ? 'off_site' : 'on_site',
    guests: num(bill?.actual_guests) || num(event.guaranteed_guests) || num(event.expected_guests) || 0,
    billed: revenue !== null, revenue, food, labour, equipment, exceptions: round(cost - food - labour - equipment), cost, margin,
    margin_pct: revenue > 0 && margin !== null ? (margin / revenue) * 100 : null,
    target_pct: num(event.applicable_target_margin_percentage),
    complete: event.actual_cost_status === 'complete',
  };
}

export function totalsOf(rows) {
  const billed = rows.filter((r) => r.billed), add = (k) => round(billed.reduce((s, r) => s + (r[k] || 0), 0));
  const revenue = add('revenue'), margin = add('margin'), guests = billed.reduce((s, r) => s + r.guests, 0);
  return {
    events_delivered: rows.length, guests_served: guests, event_revenue: revenue,
    food: add('food'), labour: add('labour'), equipment: add('equipment'), exceptions: add('exceptions'),
    event_costs: add('cost'), event_margin: margin, event_margin_pct: revenue > 0 ? (margin / revenue) * 100 : null,
  };
}

export async function cateringPnl(ctx, input) {
  const scope = await cateringScope(ctx, input), { unit, period, comparison, where } = scope, filter = readFilter(input);
  if (!scope.isOn('catering')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [rows, before] = await Promise.all([delivered(ctx, where, period, filter), delivered(ctx, where, comparison, filter)]);
  const earlier = before.length ? before : null;
  const cells = (list, range) => rangeBuckets(range, unit).map((b) => totalsOf(list.filter((r) => r.date >= b.from && r.date <= b.to)).event_revenue);
  const now = cells(rows, period), prior = earlier ? cells(earlier, comparison) : [];
  const group = (key, labels) => segments(rows, earlier, key, totalsOf, 'event_revenue', labels);
  return {
    ...replyHead(scope), available: true,
    has_activity: rows.length > 0,
    current: totalsOf(rows), previous: earlier && totalsOf(earlier),
    trend: rangeBuckets(period, unit).map((b, i) => ({ from: b.from, current: now[i], previous: earlier ? prior[i] ?? null : null })),
    by_event_type: group('event_type'),
    by_package: group('package_name'),
    by_venue_type: group('venue_type', VENUES),
    by_client: group('client'),
    events: [...rows].sort((a, b) => String(b.date).localeCompare(String(a.date))),
    unbilled: rows.filter((r) => !r.billed).length,
    incomplete: rows.filter((r) => r.billed && !r.complete).length,
  };
}