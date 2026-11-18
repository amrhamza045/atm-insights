import { readAll, linked } from './executiveCateringCommon.js';

// What the Customers & growth reports share: who may see clients, every client
// a set of records points to (merged records followed to the survivor), and
// the day each client was first served.
export const WON = ['confirmed', 'in_progress', 'completed'];
export const CORPORATE = 'corporate';

// Clients are named only to people who can open CRM clients; amounts per client
// only to those who also see client financials.
export const seesClients = (ctx) => !!(ctx.admin || ctx.permissions.crm_full_view || ctx.permissions.clients_view);
export const seesClientMoney = (ctx) => seesClients(ctx) && !!(ctx.admin || ctx.permissions.crm_full_view || ctx.permissions.financial_view);

export const inRange = (day, range) => !!day && day >= range.from && day <= range.to;
export const branchTest = (where) => { const ids = where.branch_id?.$in; return (r) => !ids || ids.includes(r.branch_id); };
export const addDays = (day, n) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Every event not cancelled, at every branch.
export const eventHistory = (ctx) => readAll(ctx.svc.entities.CateringEvent, { status: { $ne: 'cancelled' } });

const view = (c) => ({ id: c.id, name: c.name || 'Unnamed client', type: c.client_type === CORPORATE ? CORPORATE : 'individual', status: c.status || '', owner_id: c.owner_employee_id || '', owner_name: c.owner_name || '' });

export async function clientsOf(ctx, ids) {
  const E = ctx.svc.entities, found = new Map();
  let next = [...new Set(ids.filter(Boolean))];
  for (let pass = 0; next.length && pass < 4; pass += 1) {
    for (const c of await linked(E.Client, 'id', next)) found.set(c.id, c);
    next = [...new Set([...found.values()].filter((c) => c.is_merged && c.merged_into_id && !found.has(c.merged_into_id)).map((c) => c.merged_into_id))];
  }
  const resolve = (id, hops = 0) => {
    const c = found.get(id);
    if (c?.is_merged && c.merged_into_id && hops < 4) return resolve(c.merged_into_id, hops + 1);
    return c && !c.is_merged ? view(c) : null;
  };
  return resolve;
}

// The day each client was first served: their earliest delivered event, any branch.
export function firstServed(events, clientOf) {
  const first = new Map();
  for (const e of events) {
    const id = e.status === 'completed' && e.event_date ? clientOf(e.client_id)?.id : null;
    if (id && (!first.has(id) || e.event_date < first.get(id))) first.set(id, e.event_date);
  }
  return first;
}

// Clients the picked branches served for the first time in a range. The
// Overview and Clients & Retention count first-time clients this way.
export async function firstTimeCounter(ctx, where) {
  const events = await readAll(ctx.svc.entities.CateringEvent, { status: 'completed' });
  const clientOf = await clientsOf(ctx, events.map((e) => e.client_id)), first = firstServed(events, clientOf), picked = branchTest(where);
  return (range) => new Set(events.filter((e) => picked(e) && inRange(e.event_date, range)).map((e) => clientOf(e.client_id)?.id)
    .filter((id) => id && first.get(id) >= range.from)).size;
}