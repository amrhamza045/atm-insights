import { replyHead, segments, round } from './executiveCateringCommon.js';
import { sum, pct, amount } from './executiveSupplyCommon.js';
import { rangeBuckets } from './executivePeriod.js';
import { peopleScope as moduleScope, closed } from './executivePeople.js';
import { priced } from './executiveCateringPnl.js';
import { eventHistory, clientsOf, firstServed, branchTest, inRange, addDays, seesClients, seesClientMoney, CORPORATE } from './executiveCustomers.js';

// Clients & Retention: clients the picked branches served in the period
// (delivered events, at final bills as Event P&L counts them). First-time when
// their first delivered event at any branch falls in the period. As of today:
// clients due to rebook (last event delivered in the 60 days from this day a
// year ago, nothing since) and clients gone quiet (last event over a year ago).
const TYPES = { corporate: 'Corporate', individual: 'Individual', none: 'No client linked' };
const yearAgo = (day) => `${Number(day.slice(0, 4)) - 1}-${day.slice(5) === '02-29' ? '02-28' : day.slice(5)}`;

function perClient(rows) {
  const m = new Map();
  for (const r of rows) {
    if (!r.client) continue;
    const g = m.get(r.client.id) || { ...r.client, first_time: r.first_time, events: 0, revenue: 0, billed: 0 };
    g.events += 1;
    if (r.billed) { g.revenue = round(g.revenue + r.revenue); g.billed += 1; }
    m.set(r.client.id, g);
  }
  return [...m.values()];
}
const revenueOf = (rows) => sum(rows.filter((r) => r.billed), (r) => r.revenue);

function figures(rows) {
  const clients = perClient(rows), revenue = revenueOf(rows), billed = clients.filter((c) => c.billed), returning = clients.filter((c) => !c.first_time);
  const top = [...billed].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  return {
    cl_served: clients.length, cl_first_time: clients.length - returning.length, cl_returning: returning.length,
    cl_returning_share: pct(returning.length, clients.length), cl_revenue: revenue,
    cl_revenue_per_client: billed.length ? round(sum(billed, (c) => c.revenue) / billed.length) : null,
    cl_returning_revenue_share: pct(sum(returning, (c) => c.revenue), revenue),
    cl_corporate_share: pct(sum(clients.filter((c) => c.type === CORPORATE), (c) => c.revenue), revenue),
    cl_top10_share: pct(sum(top, (c) => c.revenue), revenue),
  };
}
const typeFigures = (rows) => { const n = rows.filter((r) => r.billed).length, revenue = revenueOf(rows); return { clients: perClient(rows).length, events: rows.length, revenue, avg_event_value: n ? round(revenue / n) : null }; };

async function served(ctx, events, range, clientOf, first) {
  return (await priced(ctx, events.filter((e) => inRange(e.event_date, range)))).map((r) => {
    const client = clientOf(r.client_id);
    return { ...r, client, type: client?.type || 'none', first_time: !!client && first.get(client.id) >= range.from };
  });
}

function trend(scope, rows, earlier, first) {
  const cell = (list, b) => { const ids = new Set(list.filter((r) => r.client && inRange(r.date, b)).map((r) => r.client.id)); const fresh = [...ids].filter((id) => first.get(id) >= b.from).length; return { first_time: fresh, returning: ids.size - fresh, served: ids.size }; };
  const prior = earlier ? rangeBuckets(scope.comparison, scope.unit) : [];
  return rangeBuckets(scope.period, scope.unit).map((b, i) => { const c = cell(rows, b); return { from: b.from, first_time: c.first_time, returning: c.returning, previous: earlier && prior[i] ? cell(earlier, prior[i]).served : null }; });
}

function winBack(history, clientOf, picked, today, named, money) {
  const last = new Map(), delivered = new Map();
  for (const e of history) {
    const client = clientOf(e.client_id);
    if (!client || !e.event_date) continue;
    if (e.status === 'completed') delivered.set(client.id, (delivered.get(client.id) || 0) + 1);
    const prior = last.get(client.id);
    if (!prior || e.event_date > prior.event.event_date) last.set(client.id, { client, event: e });
  }
  const from = yearAgo(today), window = { from, to: addDays(from, 59) };
  const done = [...last.values()].filter(({ client, event }) => event.status === 'completed' && picked(event) && client.status !== 'inactive');
  const row = ({ client, event }) => ({ id: client.id, name: client.name, type: client.type, owner: client.owner_name, events: delivered.get(client.id) || 0, last_event: event.event_name || 'Untitled event', last_type: event.event_type || 'Unspecified', last_date: event.event_date, last_value: money ? amount(event.quote_total) : null });
  const due = done.filter((x) => inRange(x.event.event_date, window)).sort((a, b) => a.event.event_date.localeCompare(b.event.event_date));
  const quiet = done.filter((x) => x.event.event_date < from).sort((a, b) => b.event.event_date.localeCompare(a.event.event_date));
  const list = (xs) => ({ count: xs.length, corporate: xs.filter((x) => x.client.type === CORPORATE).length, rows: named ? xs.slice(0, 100).map(row) : null });
  return { rebook_window: window, due: list(due), quiet: list(quiet) };
}

export async function customersClients(ctx, input) {
  const scope = await moduleScope(ctx, input, 'client_analytics');
  if (scope.off || !scope.isOn('crm')) return closed(scope, 'module_off');
  const picked = branchTest(scope.where), named = seesClients(ctx), money = seesClientMoney(ctx);
  const history = await eventHistory(ctx);
  const clientOf = await clientsOf(ctx, history.map((e) => e.client_id)), first = firstServed(history, clientOf);
  const delivered = history.filter((e) => e.status === 'completed' && picked(e));
  const [rows, before] = await Promise.all([served(ctx, delivered, scope.period, clientOf, first), served(ctx, delivered, scope.comparison, clientOf, first)]);
  const earlier = before.length ? before : null, revenue = revenueOf(rows);
  const top = named ? perClient(rows).sort((a, b) => (money ? b.revenue - a.revenue : 0) || b.events - a.events || a.name.localeCompare(b.name)).slice(0, 25)
    .map((c) => ({ id: c.id, name: c.name, type: c.type, owner: c.owner_name, events: c.events, first_time: c.first_time, client_since: first.get(c.id), revenue: money ? c.revenue : null, share: money ? pct(c.revenue, revenue) : null })) : null;
  const back = winBack(history, clientOf, picked, scope.today, named, money);
  return {
    ...replyHead(scope), available: true, has_activity: rows.length > 0, named, money_named: money,
    current: { ...figures(rows), cl_due: back.due.count, cl_quiet: back.quiet.count }, previous: earlier && figures(earlier), trend: trend(scope, rows, earlier, first),
    by_type: segments(rows, earlier, 'type', typeFigures, 'revenue', TYPES), top_clients: top,
    ...back,
    no_client: rows.filter((r) => !r.client).length, unbilled: rows.filter((r) => !r.billed).length,
  };
}