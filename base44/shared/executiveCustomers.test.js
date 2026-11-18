import test from 'node:test';
import assert from 'node:assert/strict';

// The reports run on the backend runtime; outside it no secret is set.
globalThis.Deno ??= { env: { get: () => '' } };
const { default: fixture } = await import('./executiveLedgerFixture.js');
const { customersLeads } = await import('./executiveCustomersLeads.js');
const { customersClients } = await import('./executiveCustomersClients.js');
const { customersCare } = await import('./executiveCustomersCare.js');
const { executiveMetrics } = await import('./executiveMetrics.js');

const query = { period: 'mtd', compare: 'previous', branch_ids: [] };
const at = (day, time = '09:00:00') => `${day}T${time}.000Z`;
const analyst = (f) => Object.assign(f.ctx, { admin: false, permissions: { analytics_view: true } });
// The day `years` years before today, moved on by `days`.
const yearsBack = (today, years, days = 0) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

test("leads count by the day entered; a booking is credited to the client's latest lead before it", async () => {
  const f = fixture(), { entities: e, dates } = f;
  e.Client.rows.push({ id: 'c1', name: 'Nile Corp', client_type: 'corporate' });
  e.Lead.rows.push(
    { id: 'l1', platform: 'whatsapp', status: 'new', created_date: at(dates.from) },
    { id: 'l2', platform: 'instagram', status: 'contacted', governorate: 'Giza', created_date: at(dates.from) },
    { id: 'l3', campaign: 'Event pass referral', referrer_name: 'Mona', referrer_phone: '+20 100', referrer_event_name: 'Gala', status: 'converted', converted_client_id: 'c1', created_date: at(dates.from, '08:00:00') },
    { id: 'l4', campaign: 'Contact us', source: 'website', status: 'lost', created_date: at(dates.from) },
    { id: 'l0', platform: 'facebook', status: 'new', created_date: at(dates.previous) },
    { id: 'l5', platform: 'facebook', status: 'converted', converted_client_id: 'c1', created_date: at(dates.previous) },
  );
  e.CateringEvent.rows.push({ id: 'ev1', client_id: 'c1', status: 'confirmed', created_date: at(dates.from, '10:00:00'), event_date: dates.today, quote_total: 5000, branch_id: 'b1' });
  e.ReferralCommission.rows.push({ referrer_key: 'p:20100', amount: 250, status: 'pending', event_date: dates.from });

  const r = await customersLeads(f.ctx, query);
  assert.deepEqual(r.current, { lead_new: 4, lead_converted: 1, lead_conversion: 25, lead_lost: 1, lead_booked: 1, lead_booking_rate: 25, lead_booked_value: 5000, lead_waiting: 2 });
  assert.deepEqual(r.previous, { lead_new: 2, lead_converted: 1, lead_conversion: 50, lead_lost: 0, lead_booked: 0, lead_booking_rate: 0, lead_booked_value: 0 });
  assert.deepEqual(r.by_source.map((s) => [s.key, s.current.lead_new, s.previous.lead_new]), [['whatsapp', 1, 0], ['instagram', 1, 0], ['referral', 1, 0], ['website', 1, 0], ['facebook', 0, 2]]);
  assert.deepEqual(r.stages.map((s) => [s.key, s.count]), [['new', 1], ['contacted', 1], ['qualified', 0], ['converted', 1], ['lost', 1]]);
  assert.deepEqual(r.by_area.map((a) => [a.label, a.current.lead_new]), [['Not given', 3], ['Giza', 1]]);
  assert.equal(r.waiting.count, 2);
  assert.deepEqual(r.referrals.commissions, { earned: 250, paid: 0, owed: 250, earlier_earned: 0, earlier_paid: 0 });
  assert.deepEqual(r.referrals.referrers.map((x) => [x.name, x.event, x.lead_new, x.lead_booked, x.commission]), [['Mona', 'Gala', 1, 1, 250]]);

  const hidden = await customersLeads(analyst(f), query);
  assert.equal(hidden.referrals.commissions, null);
  assert.equal(hidden.referrals.referrers, null);
  assert.deepEqual(hidden.referrals.events.map((x) => [x.name, x.lead_new]), [['Gala', 1]]);
});

test('clients served split into first-time and returning, merged records count once, and win-back lists run as of today', async () => {
  const f = fixture(), { entities: e, dates } = f, back = (years, days) => yearsBack(dates.today, years, days);
  e.Client.rows.push(
    { id: 'c1', name: 'Nile Corp', client_type: 'corporate', owner_name: 'Sara' },
    { id: 'c2', name: 'Hana Adel' },
    { id: 'c3', name: 'Hana A.', is_merged: true, merged_into_id: 'c2' },
    { id: 'c4', name: 'Delta Bank', client_type: 'corporate' },
    { id: 'c5', name: 'Omar Fathy' },
  );
  const event = (id, client_id, event_date, revenue, extra = {}) => e.CateringEvent.rows.push({ id, client_id, event_date, status: 'completed', branch_id: 'b1', actual_revenue: revenue, quote_total: revenue, event_name: id, ...extra });
  event('e0', 'c1', back(3), 800);
  event('e1', 'c1', dates.from, 1000);
  event('e2', 'c3', dates.from, 2000);
  event('e3', '', dates.from, 500);
  event('e4', 'c4', back(2), 700);
  event('e5', 'c5', back(1, 10), 900, { event_type: 'Birthday' });

  const r = await customersClients(f.ctx, query);
  assert.deepEqual(r.current, { cl_served: 2, cl_first_time: 1, cl_returning: 1, cl_returning_share: 50, cl_revenue: 3500, cl_revenue_per_client: 1500, cl_returning_revenue_share: 28.57, cl_corporate_share: 28.57, cl_top10_share: 85.71, cl_due: 1, cl_quiet: 1 });
  assert.equal(r.previous, null);
  assert.deepEqual(r.trend[0], { from: dates.from, first_time: 1, returning: 1, previous: null });
  assert.deepEqual(r.by_type.map((t) => [t.key, t.label, t.current.clients, t.current.revenue]), [['individual', 'Individual', 1, 2000], ['corporate', 'Corporate', 1, 1000], ['none', 'No client linked', 0, 500]]);
  assert.deepEqual(r.top_clients.map((c) => [c.name, c.first_time, c.client_since, c.revenue, c.share]), [['Hana Adel', true, dates.from, 2000, 57.14], ['Nile Corp', false, back(3), 1000, 28.57]]);
  assert.deepEqual(r.due.rows, [{ id: 'c5', name: 'Omar Fathy', type: 'individual', owner: '', events: 1, last_event: 'e5', last_type: 'Birthday', last_date: back(1, 10), last_value: 900 }]);
  assert.deepEqual([r.quiet.count, r.quiet.corporate, r.quiet.rows[0].name], [1, 1, 'Delta Bank']);
  assert.equal(r.no_client, 1);

  const hidden = await customersClients(analyst(f), query);
  assert.deepEqual([hidden.named, hidden.top_clients, hidden.due.rows, hidden.due.count], [false, null, null, 1]);

  // The Overview's new clients are the same first-time clients.
  const overview = await executiveMetrics(Object.assign(f.ctx, { admin: true, permissions: {} }), query);
  assert.equal(overview.crm.current.new_clients, 1);
});

test('client care counts contacts, complaints per 100 delivered events and follow-ups done on time, with quiet accounts as of today', async () => {
  const f = fixture(), { entities: e, dates } = f;
  e.Employee.rows.push({ id: 'emp1', name: 'Sara Ali', email: 'sara@example.invalid' });
  e.Client.rows.push(
    { id: 'c1', name: 'Nile Corp', client_type: 'corporate', owner_employee_id: 'emp1', owner_name: 'Sara Ali' },
    { id: 'c2', name: 'Hana Adel' },
    { id: 'c4', name: 'Delta Bank', client_type: 'corporate' },
  );
  e.CateringEvent.rows.push(
    { id: 'e1', client_id: 'c1', status: 'completed', event_date: dates.from, branch_id: 'b1', actual_revenue: 1000 },
    { id: 'e2', client_id: 'c2', status: 'completed', event_date: dates.from, branch_id: 'b2', actual_revenue: 2000 },
    { id: 'e4', client_id: 'c4', status: 'completed', event_date: '2024-03-01', branch_id: 'b1' },
  );
  const note = (id, type, client_id, day, by, extra = {}) => e.ClientInteraction.rows.push({ id, interaction_type: type, client_id, client_name: client_id, occurred_at: at(day), created_by_email: by, created_by_name: by.split('@')[0], ...extra });
  note('n1', 'call', 'c1', dates.from, 'sara@example.invalid', { follow_up_date: dates.from, follow_up_completed: true, follow_up_completed_at: at(dates.from, '12:00:00') });
  note('n2', 'whatsapp', 'c2', dates.from, 'omar@example.invalid');
  note('n3', 'complaint', 'c2', dates.from, 'omar@example.invalid', { note: 'Food arrived late' });
  note('n4', 'note', 'c1', dates.from, 'sara@example.invalid');
  note('n5', 'call', 'c2', dates.previous, 'omar@example.invalid', { follow_up_date: dates.previous });

  const r = await customersCare(f.ctx, query);
  assert.deepEqual(r.current, { care_contacts: 2, care_clients_contacted: 2, care_complaints: 1, care_complaint_rate: 50, care_follow_ups_due: 1, care_on_time_rate: 100, care_overdue: 1, care_quiet: 1 });
  assert.deepEqual(r.previous, { care_contacts: 1, care_clients_contacted: 1, care_complaints: 0, care_complaint_rate: null, care_follow_ups_due: 1, care_on_time_rate: 0 });
  assert.deepEqual(r.types.filter((t) => t.count).map((t) => [t.key, t.count]), [['call', 1], ['whatsapp', 1], ['note', 1], ['complaint', 1]]);
  assert.deepEqual(r.team.map((m) => [m.name, m.clients, m.contacts, m.complaints, m.overdue, m.revenue]), [['Sara Ali', 1, 1, 0, 0, 1000], ['omar', 0, 1, 1, 1, 0]]);
  assert.deepEqual(r.quiet.rows.map((q) => [q.name, q.last_contact, q.last_event]), [['Delta Bank', null, '2024-03-01']]);
  assert.deepEqual(r.complaints.map((c) => [c.client, c.note]), [['c2', 'Food arrived late']]);

  const hidden = await customersCare(analyst(f), query);
  assert.deepEqual([hidden.team, hidden.quiet.rows, hidden.complaints, hidden.quiet.count], [null, null, null, 1]);
});