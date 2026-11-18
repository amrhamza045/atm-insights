import { readAll, cateringScope, replyHead, num, round } from './executiveCateringCommon.js';
import { policySchedule } from './paymentPolicyRules.js';
import { supplierInvoicesDue } from './executiveSupplierDue.js';
import { addDays } from './executiveCustomers.js';

// Predictive Analytics: the next 30, 60 and 90 days from the records already
// in the system (no guesswork model). Booked events count in full; open
// enquiries and quotes count at the booking rate of the last 12 months. Cash
// to collect follows each event's saved payment policy (its whole balance by
// the event day without one); supplier cash follows invoice due dates.
const BOOKED = ['confirmed', 'in_progress'], OPEN = ['enquiry', 'quoted', 'deposit_pending', 'deposit_pending_verification'];
const OWING = ['deposit_pending', 'confirmed', 'in_progress'], HORIZONS = [30, 60, 90];
const amount = (v) => num(v) ?? 0;
const sum = (rows, f) => round(rows.reduce((s, r) => s + (f(r) || 0), 0));
const guestsOf = (e) => amount(e.guaranteed_guests) || amount(e.expected_guests);
const unfilled = (e) => Math.max(0, amount(e.staffing_required_count) - amount(e.staffing_assigned_count));
const yearBack = (day) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() - 1); return d.toISOString().slice(0, 10); };

// What an event should have paid by `day`, beyond what it has paid.
function owedBy(e, day) {
  const paid = amount(e.total_paid);
  if (!e.payment_policy?.schedule?.length || !e.payment_policy_booked_on) return e.event_date <= day ? Math.max(0, amount(e.balance_due)) : 0;
  const schedule = policySchedule(e.payment_policy, { bookedOn: e.payment_policy_booked_on, eventDate: e.event_date, quoteTotal: amount(e.quote_total), grandTotal: paid + amount(e.balance_due) });
  return Math.max(0, round(schedule.requiredBy(day) - paid));
}

// Share of enquiries raised in the last 12 months that were booked, of those decided.
async function bookingRate(E, where, today) {
  const since = `${addDays(today, -365)}T00:00:00.000Z`;
  const [won, lost] = await Promise.all([
    E.CateringEvent.count({ ...where, created_date: { $gte: since }, status: { $in: [...BOOKED, 'completed'] } }),
    E.CateringEvent.count({ ...where, created_date: { $gte: since }, status: 'cancelled' }),
  ]);
  return { won, lost, rate: won + lost > 0 ? round((won / (won + lost)) * 100) : null };
}

function busiest(ahead) {
  const days = new Map();
  for (const e of ahead) {
    const d = days.get(e.event_date) || { id: e.event_date, date: e.event_date, booked: 0, open: 0, guests: 0, crew: 0 };
    if (BOOKED.includes(e.status)) { d.booked += 1; d.guests += guestsOf(e); d.crew += amount(e.staffing_required_count); } else d.open += 1;
    days.set(e.event_date, d);
  }
  return [...days.values()].filter((d) => d.booked > 0)
    .sort((a, b) => b.crew - a.crew || b.guests - a.guests || b.booked - a.booked).slice(0, 5)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function executiveOutlook(ctx, input) {
  const scope = await cateringScope(ctx, { ...input, period: undefined, compare: undefined });
  if (!scope.isOn('catering')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const E = ctx.svc.entities, { where, today } = scope, end = addDays(today, 89), yesterday = addDays(today, -1);
  const suppliersOn = scope.isOn('suppliers'), staffOn = scope.isOn('hr_employees');
  const [ahead, lastYear, owing, rate, invoices, staff] = await Promise.all([
    readAll(E.CateringEvent, { ...where, status: { $in: [...BOOKED, ...OPEN] }, event_date: { $gte: today, $lte: end } }),
    readAll(E.CateringEvent, { ...where, status: 'completed', event_date: { $gte: yearBack(today), $lte: yearBack(end) } }),
    readAll(E.CateringEvent, { ...where, status: { $in: OWING }, event_date: { $gte: today } }),
    bookingRate(E, where, today),
    suppliersOn ? supplierInvoicesDue(ctx, where, end) : null,
    staffOn ? E.Employee.count({ ...where, status: 'active', employment_type: { $nin: ['freelance', 'system_account'] } }) : null,
  ]);
  const overdueNow = sum(owing, (e) => owedBy(e, yesterday));
  const horizon = (days) => {
    const to = addDays(today, days - 1), inside = ahead.filter((e) => e.event_date <= to);
    const booked = inside.filter((e) => BOOKED.includes(e.status)), open = inside.filter((e) => !BOOKED.includes(e.status));
    const last = lastYear.filter((e) => e.event_date <= yearBack(to));
    const bookedValue = sum(booked, (e) => amount(e.quote_total)), openValue = sum(open, (e) => amount(e.quote_total));
    return {
      id: String(days), days, to,
      booked_events: booked.length, booked_value: bookedValue, open_events: open.length, open_value: openValue,
      expected_value: rate.rate == null ? bookedValue : round(bookedValue + (openValue * rate.rate) / 100),
      last_year_events: last.length, last_year_value: sum(last, (e) => amount(e.quote_total)),
      cash_in: Math.max(0, round(sum(owing, (e) => owedBy(e, to)) - overdueNow)),
      supplier_due: invoices ? sum(invoices.filter((d) => d.due >= today && d.due <= to), (d) => d.outstanding) : null,
      guests: sum(booked, guestsOf), crew: sum(booked, (e) => amount(e.staffing_required_count)), crew_unfilled: sum(booked, unfilled),
      critical_unfilled: sum(booked, (e) => amount(e.staffing_unfilled_critical_count)), stock_gap_events: booked.filter((e) => amount(e.open_shortfall_count) > 0).length,
    };
  };
  return {
    ...replyHead(scope), available: true, rate, horizons: HORIZONS.map(horizon), overdue_now: overdueNow,
    supplier_overdue: invoices ? sum(invoices.filter((d) => d.due < today), (d) => d.outstanding) : null,
    staff_on_books: staff, busiest: busiest(ahead),
  };
}