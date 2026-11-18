import { readAll, cateringScope, replyHead, segments, round } from './executiveCateringCommon.js';
import { rangeBuckets } from './executivePeriod.js';
import { dayInOffset } from './companyTimezone.js';
import { readFilter, filterEvents } from './executiveCateringFilter.js';

// Bookings & Pipeline for the Executive Dashboard. In the period: the
// enquiries entered (events created in it) and what has become of each, and
// the events cancelled in it. As of today, whatever the period: the confirmed
// work and the open pipeline dated today or later, and the events dated before
// today that were never delivered or cancelled. Every record is read on the
// server, so nothing is cut off.
const WON = ['confirmed', 'in_progress', 'completed'], BOOKED = ['confirmed', 'in_progress'];
const STAGES = { enquiry: 'Enquiry', quoted: 'Quoted', deposit_pending: 'Awaiting deposit', deposit_pending_verification: 'Deposit being checked', confirmed: 'Confirmed', in_progress: 'In progress' };
const OPEN = Object.keys(STAGES).filter((s) => !BOOKED.includes(s));
const OUTCOMES = [['won', 'Booked', WON], ['open', 'Still open', OPEN], ['cancelled', 'Cancelled', ['cancelled']]];
const amount = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sum = (rows, field) => round(rows.reduce((s, r) => s + amount(r[field]), 0));
const named = (e) => ({ id: e.id, name: e.event_name || 'Untitled event', client: e.client_name || 'No client name', event_type: e.event_type || 'Unspecified' });

// The company-local day of a timestamp. Platform timestamps without a zone are UTC; a bare date is already a day.
export function localDay(value, offset) {
  const s = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const stamp = new Date(/(Z|[+-]\d\d:?\d\d)$/.test(s) ? s : `${s.slice(0, 23)}Z`);
  return Number.isFinite(stamp.getTime()) ? dayInOffset(stamp, offset) : null;
}

function enquiryFigures(rows) {
  const won = rows.filter((e) => WON.includes(e.status));
  return { new_enquiries: rows.length, won_events: won.length, booking_conversion: rows.length ? (won.length / rows.length) * 100 : null, won_value: sum(won, 'quote_total') };
}

const cancelFigures = (rows) => ({ cancellations: rows.length, cancelled_value: sum(rows, 'quote_total'), penalties_kept: sum(rows, 'cancellation_penalty_amount') });

async function periodRows(ctx, where, stamps, filter) {
  const E = ctx.svc.entities;
  const [entered, ended] = await Promise.all([
    readAll(E.CateringEvent, { ...where, created_date: stamps }),
    readAll(E.CateringEvent, { ...where, status: 'cancelled', cancelled_date: stamps }),
  ]);
  const [enquiries, cancelled] = await Promise.all([filterEvents(ctx, entered, filter), filterEvents(ctx, ended, filter)]);
  return { enquiries: enquiries.map((e) => ({ ...e, type: e.event_type || 'Unspecified' })), cancelled };
}

function aheadFigures(rows) {
  const booked = rows.filter((e) => BOOKED.includes(e.status)), open = rows.filter((e) => !BOOKED.includes(e.status));
  const required = booked.reduce((s, e) => s + amount(e.staffing_required_count), 0);
  const filled = booked.reduce((s, e) => s + Math.min(amount(e.staffing_assigned_count), amount(e.staffing_required_count)), 0);
  return {
    booked_events: booked.length, booked_value: sum(booked, 'quote_total'), balance_due: sum(booked, 'balance_due'),
    open_events: open.length, open_value: sum(open, 'quote_total'),
    staffing_coverage: required > 0 ? (filled / required) * 100 : null,
  };
}

// Quote totals ahead by event month: this month and the eleven after it, then Later (from: null).
function forwardBook(rows, today) {
  const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)) - 1;
  const months = Array.from({ length: 12 }, (_, i) => ({ from: new Date(Date.UTC(y, m + i, 1)).toISOString().slice(0, 10), confirmed: 0, open: 0 }));
  const later = { from: null, confirmed: 0, open: 0 };
  for (const e of rows) {
    const bucket = months.find((b) => b.from.slice(0, 7) === e.event_date.slice(0, 7)) || later;
    bucket[BOOKED.includes(e.status) ? 'confirmed' : 'open'] += amount(e.quote_total);
  }
  return [...months, ...(later.confirmed || later.open ? [later] : [])].map((b) => ({ ...b, confirmed: round(b.confirmed), open: round(b.open) }));
}

const listed = (rows) => [...rows]
  .sort((a, b) => `${a.event_date} ${a.start_time || ''}`.localeCompare(`${b.event_date} ${b.start_time || ''}`))
  .map((e) => ({
    ...named(e), date: e.event_date, stage: STAGES[e.status], booked: BOOKED.includes(e.status),
    guests: amount(e.guaranteed_guests) || amount(e.expected_guests), value: amount(e.quote_total), paid: amount(e.total_paid), balance: amount(e.balance_due),
    staff_assigned: amount(e.staffing_assigned_count), staff_required: amount(e.staffing_required_count),
  }));

const cancellations = (rows, offset) => rows
  .map((e) => ({ ...named(e), event_date: e.event_date, cancelled_on: localDay(e.cancelled_date, offset), value: amount(e.quote_total), penalty: amount(e.cancellation_penalty_amount), reason: e.cancellation_reason || '' }))
  .sort((a, b) => String(b.cancelled_on || '').localeCompare(String(a.cancelled_on || '')));

export async function cateringPipeline(ctx, input) {
  const scope = await cateringScope(ctx, input), { today, offset, unit, period, comparison, stamps, where } = scope, filter = readFilter(input);
  if (!scope.isOn('catering')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const open = (dates) => readAll(ctx.svc.entities.CateringEvent, { ...where, status: { $in: Object.keys(STAGES) }, event_date: dates }).then((rows) => filterEvents(ctx, rows, filter));
  const [now, before, ahead, overdue] = await Promise.all([
    periodRows(ctx, where, stamps.current, filter),
    periodRows(ctx, where, stamps.comparison, filter),
    open({ $gte: today }),
    open({ $lt: today }),
  ]);
  const compared = before.enquiries.length + before.cancelled.length > 0;
  const cells = (rows, range) => {
    const days = rows.map((e) => localDay(e.created_date, offset));
    return rangeBuckets(range, unit).map((b) => days.filter((d) => d && d >= b.from && d <= b.to).length);
  };
  const trend = cells(now.enquiries, period), prior = compared ? cells(before.enquiries, comparison) : [];
  const split = (list, statuses) => list.filter((e) => statuses.includes(e.status));
  return {
    ...replyHead(scope), available: true,
    has_activity: now.enquiries.length + now.cancelled.length > 0,
    current: { ...enquiryFigures(now.enquiries), ...cancelFigures(now.cancelled) },
    previous: compared ? { ...enquiryFigures(before.enquiries), ...cancelFigures(before.cancelled) } : null,
    trend: rangeBuckets(period, unit).map((b, i) => ({ from: b.from, current: trend[i], previous: compared ? prior[i] ?? null : null })),
    outcomes: OUTCOMES.map(([key, label, statuses]) => ({ key, label, count: split(now.enquiries, statuses).length, value: sum(split(now.enquiries, statuses), 'quote_total') })),
    by_event_type: segments(now.enquiries, compared ? before.enquiries : null, 'type', enquiryFigures, 'new_enquiries'),
    cancelled: cancellations(now.cancelled, offset),
    ahead: aheadFigures(ahead),
    stages: Object.entries(STAGES).map(([key, label]) => ({ key, label, booked: BOOKED.includes(key), count: split(ahead, [key]).length, value: sum(split(ahead, [key]), 'quote_total') })),
    forward: forwardBook(ahead, today),
    upcoming: listed(ahead),
    overdue: { count: overdue.length, value: sum(overdue, 'quote_total'), events: listed(overdue) },
  };
}