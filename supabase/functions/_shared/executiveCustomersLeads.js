import { readAll, linked, replyHead, segments, round } from './executiveCateringCommon.js';
import { pct, trendOf, amount, sum } from './executiveSupplyCommon.js';
import { peopleScope as moduleScope, closed } from './executivePeople.js';
import { localDay } from './executiveCateringPipeline.js';
import { clientsOf, WON, addDays, inRange, seesClients } from './executiveCustomers.js';

// Leads & Sources, for the whole business: leads that arrived in the period
// (by the day entered) and what became of each. Converted once staff convert
// it into a client; booked when that client's first booking (Confirmed, In
// progress or Completed) entered after the lead, for an event on or after its
// day, is credited to it — the client's latest lead before the booking.
const SOURCES = { whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok', website: 'Website contact form', referral: 'Guest referrals', other: 'Other' };
const STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['qualified', 'Qualified'], ['converted', 'Converted'], ['lost', 'Lost']];
// The campaigns the referral and contact forms write.
const REFERRAL = 'Event pass referral', WEBSITE = 'Contact us';
const sourceOf = (l) => (l.campaign === REFERRAL ? 'referral' : l.campaign === WEBSITE ? 'website' : SOURCES[l.platform || l.source] ? l.platform || l.source : 'other');
const stageOf = (l) => (l.converted_client_id || l.status === 'converted' ? 'converted' : l.status === 'closed' || l.status === 'lost' ? 'lost' : STAGES.some(([k]) => k === l.status) ? l.status : 'new');
const stamp = (s) => { const v = String(s || ''); return Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(v) ? v : `${v.slice(0, 23)}Z`); };
const shaped = (l, offset) => ({ ...l, day: localDay(l.created_date, offset), source: sourceOf(l), stage: stageOf(l), campaign_key: l.campaign || 'No campaign', area: l.governorate || 'Not given' });

async function creditBookings(ctx, leads, offset) {
  const E = ctx.svc.entities, raw = [...new Set(leads.map((l) => l.converted_client_id).filter(Boolean))];
  if (!raw.length) return new Map();
  const clientOf = await clientsOf(ctx, raw), ids = [...new Set([...raw, ...raw.map((id) => clientOf(id)?.id).filter(Boolean)])];
  const [all, events] = await Promise.all([linked(E.Lead, 'converted_client_id', ids), linked(E.CateringEvent, 'client_id', ids, { status: { $in: WON } })]);
  const group = (rows, idOf) => rows.reduce((m, r) => { const id = idOf(r); return id ? m.set(id, [...(m.get(id) || []), r]) : m; }, new Map());
  const leadsOf = group(all, (l) => clientOf(l.converted_client_id)?.id), eventsOf = group(events, (e) => clientOf(e.client_id)?.id), credit = new Map();
  for (const [id, list] of leadsOf) {
    const arrivals = list.map((l) => ({ id: l.id, at: stamp(l.created_date), day: localDay(l.created_date, offset) })).sort((a, b) => a.at - b.at);
    for (const e of (eventsOf.get(id) || []).sort((a, b) => stamp(a.created_date) - stamp(b.created_date))) {
      const lead = arrivals.filter((l) => l.at <= stamp(e.created_date) && l.day <= e.event_date).at(-1);
      if (lead && !credit.has(lead.id)) credit.set(lead.id, { event_id: e.id, value: amount(e.quote_total) });
    }
  }
  return credit;
}

const leadFigures = (list, credit) => {
  const count = (s) => list.filter((l) => l.stage === s).length, booked = list.filter((l) => credit.has(l.id));
  return { lead_new: list.length, lead_converted: count('converted'), lead_conversion: pct(count('converted'), list.length), lead_lost: count('lost'), lead_booked: booked.length, lead_booking_rate: pct(booked.length, list.length), lead_booked_value: round(booked.reduce((s, l) => s + credit.get(l.id).value, 0)) };
};

async function referrals(ctx, scope, rows, earlier, figures) {
  const mine = rows.filter((l) => l.source === 'referral'), before = earlier && earlier.filter((l) => l.source === 'referral');
  const money = !!(ctx.admin || ctx.permissions.financial_view), named = seesClients(ctx) || !!ctx.permissions.catering_view;
  const commissions = money ? await readAll(ctx.svc.entities.ReferralCommission, {}) : [];
  const earned = (r) => sum(commissions.filter((c) => inRange(c.event_date, r)), (c) => c.amount);
  const paid = (r) => sum(commissions.filter((c) => c.status === 'paid' && inRange(c.paid_date, r)), (c) => c.amount);
  const keyOf = (l) => { const p = String(l.referrer_phone || '').replace(/\D/g, ''); if (p) return `p:${p}`; const e = String(l.referrer_email || '').trim().toLowerCase(); return e ? `e:${e}` : `n:${String(l.referrer_name || '').trim().toLowerCase()}`; };
  const groups = (keyFn) => [...mine.reduce((m, l) => m.set(keyFn(l), [...(m.get(keyFn(l)) || []), l]), new Map())];
  return {
    current: figures(mine), previous: before ? figures(before) : null,
    commissions: money ? { earned: earned(scope.period), paid: paid(scope.period), owed: sum(commissions.filter((c) => c.status !== 'paid'), (c) => c.amount), earlier_earned: earned(scope.comparison), earlier_paid: paid(scope.comparison) } : null,
    referrers: named ? groups(keyOf).map(([key, list], i) => ({ id: String(i + 1), name: list[0].referrer_name || 'Unnamed guest', event: list[0].referrer_event_name || '', ...figures(list), commission: money ? sum(commissions.filter((c) => c.referrer_key === key && inRange(c.event_date, scope.period)), (c) => c.amount) : null })).sort((a, b) => b.lead_new - a.lead_new) : null,
    events: groups((l) => l.referrer_event_name || 'Unknown event').map(([name, list]) => ({ name, ...figures(list) })).sort((a, b) => b.lead_new - a.lead_new).slice(0, 10),
  };
}

export async function customersLeads(ctx, input) {
  const scope = await moduleScope(ctx, input, 'crm');
  if (scope.off) return closed(scope, 'module_off');
  const E = ctx.svc.entities, { stamps, offset, today } = scope;
  const [now, before, waiting] = await Promise.all([readAll(E.Lead, { created_date: stamps.current }), readAll(E.Lead, { created_date: stamps.comparison }), readAll(E.Lead, { status: 'new' })]);
  const rows = now.map((l) => shaped(l, offset)), prior = before.map((l) => shaped(l, offset)), earlier = prior.length ? prior : null;
  const credit = await creditBookings(ctx, [...rows, ...prior], offset), figures = (list) => leadFigures(list, credit);
  const fresh = waiting.filter((l) => !l.converted_client_id), cutoff = addDays(today, -2);
  return {
    ...replyHead(scope), available: true, has_activity: rows.length > 0, narrowed: !!scope.where.branch_id,
    current: { ...figures(rows), lead_waiting: fresh.length }, previous: earlier && figures(earlier),
    waiting: { count: fresh.length, over_two_days: fresh.filter((l) => localDay(l.created_date, offset) < cutoff).length },
    trend: trendOf(scope, rows, earlier, (l) => l.day, () => 1),
    stages: STAGES.map(([key, label]) => ({ key, label, count: rows.filter((l) => l.stage === key).length })),
    by_source: segments(rows, earlier, 'source', figures, 'lead_new', SOURCES),
    by_campaign: segments(rows, earlier, 'campaign_key', figures, 'lead_new'),
    by_area: segments(rows, null, 'area', figures, 'lead_new'),
    referrals: await referrals(ctx, scope, rows, earlier, figures),
  };
}