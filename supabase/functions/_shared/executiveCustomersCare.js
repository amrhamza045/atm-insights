import { readAll, linked, replyHead, round } from './executiveCateringCommon.js';
import { pct, within, trendOf, sum } from './executiveSupplyCommon.js';
import { peopleScope as moduleScope, closed } from './executivePeople.js';
import { localDay } from './executiveCateringPipeline.js';
import { priced } from './executiveCateringPnl.js';
import { eventHistory, clientsOf, addDays, inRange, seesClients, seesClientMoney, CORPORATE } from './executiveCustomers.js';

// Client Care, for the whole business: contacts logged with clients in the
// period (calls, WhatsApp, meetings, emails), complaints (per 100 delivered
// events), follow-ups due and done on time. As of today: follow-ups overdue and
// corporate clients with a booking whose last contact is over 90 days old.
const CONTACTS = ['call', 'whatsapp', 'meeting', 'email'];
const TYPES = [['call', 'Calls'], ['whatsapp', 'WhatsApp'], ['meeting', 'Meetings'], ['email', 'Emails'], ['note', 'Notes'], ['other', 'Other'], ['complaint', 'Complaints']];
const isContact = (n) => CONTACTS.includes(n.interaction_type);

function figures(list, due, events, offset) {
  const contacts = list.filter(isContact), complaints = list.filter((n) => n.interaction_type === 'complaint');
  const onTime = due.filter((f) => f.follow_up_completed && f.follow_up_completed_at && localDay(f.follow_up_completed_at, offset) <= f.follow_up_date);
  return {
    care_contacts: contacts.length, care_clients_contacted: new Set(contacts.map((n) => n.client_id).filter(Boolean)).size,
    care_complaints: complaints.length, care_complaint_rate: events > 0 ? round((complaints.length / events) * 100) : null,
    care_follow_ups_due: due.length, care_on_time_rate: pct(onTime.length, due.length),
  };
}

async function quietAccounts(ctx, history, clientOf, today, offset, named) {
  const accounts = new Map();
  for (const e of history) {
    const c = clientOf(e.client_id);
    if (c?.type !== CORPORATE || c.status === 'inactive') continue;
    const a = accounts.get(c.id) || { client: c, events: 0, last_event: '' };
    a.events += 1; if (e.event_date > a.last_event) a.last_event = e.event_date;
    accounts.set(c.id, a);
  }
  const last = new Map();
  for (const n of accounts.size ? await linked(ctx.svc.entities.ClientInteraction, 'client_id', [...accounts.keys()], { interaction_type: { $in: CONTACTS } }) : []) {
    const day = localDay(n.occurred_at, offset); if (day && day > (last.get(n.client_id) || '')) last.set(n.client_id, day);
  }
  const cutoff = addDays(today, -90);
  const quiet = [...accounts.values()].filter((a) => (last.get(a.client.id) || '') < cutoff).sort((a, b) => (last.get(a.client.id) || '').localeCompare(last.get(b.client.id) || ''));
  return { count: quiet.length, rows: named ? quiet.slice(0, 100).map((a) => ({ id: a.client.id, name: a.client.name, owner: a.client.owner_name, last_contact: last.get(a.client.id) || null, last_event: a.last_event, events: a.events })) : null };
}

// Per team member: clients owned (by HR record), contacts and complaints they
// logged, follow-ups they owe, and the revenue of their clients' delivered events.
async function careTeam(ctx, notes, overdue, events, money) {
  const E = ctx.svc.entities, people = new Map(), key = (s) => String(s || '').trim().toLowerCase();
  const member = (k, name) => { if (!people.has(k)) people.set(k, { name: name || 'Unnamed', clients: 0, contacts: 0, complaints: 0, overdue: 0, owns: new Set() }); const m = people.get(k); if (name && m.name === 'Unnamed') m.name = name; return m; };
  const owned = (await readAll(E.Client, { owner_employee_id: { $exists: true } })).filter((c) => c.owner_employee_id && !c.is_merged);
  const staff = new Map((await linked(E.Employee, 'id', owned.map((c) => c.owner_employee_id))).map((p) => [p.id, p]));
  for (const c of owned) { const p = staff.get(c.owner_employee_id), m = member(key(p?.email) || `hr:${c.owner_employee_id}`, p?.name || c.owner_name); m.clients += 1; m.owns.add(c.id); }
  for (const n of notes) if (n.created_by_email) { const m = member(key(n.created_by_email), n.created_by_name); if (isContact(n)) m.contacts += 1; if (n.interaction_type === 'complaint') m.complaints += 1; }
  for (const f of overdue) if (f.created_by_email) member(key(f.created_by_email), f.created_by_name).overdue += 1;
  const rows = money ? await priced(ctx, events) : [];
  return [...people.values()].filter((m) => m.clients || m.contacts || m.complaints || m.overdue)
    .map((m, i) => ({ id: String(i + 1), name: m.name, clients: m.clients, contacts: m.contacts, complaints: m.complaints, overdue: m.overdue, revenue: money ? sum(rows.filter((r) => r.billed && m.owns.has(r.client_id)), (r) => r.revenue) : null }))
    .sort((a, b) => b.contacts - a.contacts || b.clients - a.clients || a.name.localeCompare(b.name));
}

export async function customersCare(ctx, input) {
  const scope = await moduleScope(ctx, input, 'crm');
  if (scope.off) return closed(scope, 'module_off');
  const E = ctx.svc.entities, { period, comparison, stamps, offset, today } = scope, named = seesClients(ctx), money = seesClientMoney(ctx);
  const notes = (s) => readAll(E.ClientInteraction, { occurred_at: s }).then((r) => r.map((n) => ({ ...n, day: localDay(n.occurred_at, offset) })));
  const due = (r) => readAll(E.ClientInteraction, { follow_up_date: within(r) });
  const held = (r) => E.CateringEvent.count({ status: 'completed', event_date: within(r) });
  const [list, before, dueNow, dueBefore, heldNow, heldBefore] = await Promise.all([notes(stamps.current), notes(stamps.comparison), due(period), due(comparison), held(period), held(comparison)]);
  const [open, history] = await Promise.all([readAll(E.ClientInteraction, { follow_up_completed: { $ne: true }, follow_up_date: { $lt: today } }), eventHistory(ctx)]);
  const overdue = open.filter((f) => f.follow_up_date), clientOf = await clientsOf(ctx, history.map((e) => e.client_id));
  const compared = before.length + dueBefore.length > 0, quiet = await quietAccounts(ctx, history, clientOf, today, offset, named);
  return {
    ...replyHead(scope), available: true, has_activity: list.length + dueNow.length > 0, narrowed: !!scope.where.branch_id, named, money_named: money,
    current: { ...figures(list, dueNow, heldNow, offset), care_overdue: overdue.length, care_quiet: quiet.count },
    previous: compared ? figures(before, dueBefore, heldBefore, offset) : null,
    trend: trendOf(scope, list.filter(isContact), compared ? before.filter(isContact) : null, (n) => n.day, () => 1),
    types: TYPES.map(([key, label]) => ({ key, label, count: list.filter((n) => n.interaction_type === key).length })),
    team: named ? await careTeam(ctx, list, overdue, history.filter((e) => e.status === 'completed' && inRange(e.event_date, period)), money) : null,
    quiet,
    complaints: named ? list.filter((n) => n.interaction_type === 'complaint').sort((a, b) => String(b.day).localeCompare(String(a.day))).slice(0, 25)
      .map((n) => ({ id: n.id, day: n.day, client: n.client_name || 'Unnamed client', logged_by: n.created_by_name || '', note: String(n.note || '').slice(0, 280) })) : null,
  };
}