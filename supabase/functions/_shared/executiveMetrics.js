import { moduleSwitches, reportBranches } from './executiveAccess.js';
import { resolvePeriod } from './executivePeriod.js';
import { firstTimeCounter } from './executiveCustomers.js';

// Executive Dashboard figures from day-to-day records (catering, CRM), totalled
// on the server for the picked branches and the standard period. A module
// switched off for this person answers { available: false }.
const COLLECTED = ['deposit', 'final_balance', 'additional', 'penalty'], PAID_BACK = ['refund', 'deposit_withdrawal'];
const BOOKED = ['confirmed', 'in_progress'], OPEN = ['enquiry', 'quoted', 'deposit_pending', 'deposit_pending_verification'];
const total = (rows, field) => rows.reduce((s, r) => s + Number(r[field] || 0), 0);

async function cateringFigures(svc, where, range, stamps) {
  const [held, payments] = await Promise.all([
    svc.entities.CateringEvent.aggregate({ query: { ...where, status: 'completed', event_date: { $gte: range.from, $lte: range.to } }, groupBy: 'status', sum: ['quote_total'], limit: 5 }),
    svc.entities.CateringPayment.aggregate({ query: { ...where, status: 'completed', payment_date: stamps }, groupBy: 'payment_type', sum: ['amount'], limit: 20 }),
  ]);
  const paid = (types) => total(payments.rows.filter((r) => types.includes(r.payment_type)), 'sum_amount');
  const events = total(held.rows, 'count'), value = total(held.rows, 'sum_quote_total');
  return { events_held: events, held_value: value, avg_event_value: events ? value / events : null, collected: paid(COLLECTED) - paid(PAID_BACK) };
}

// A snapshot as of today: confirmed work ahead and the open pipeline.
async function cateringAhead(svc, where, today) {
  const ahead = (status) => svc.entities.CateringEvent.aggregate({ query: { ...where, status: { $in: status }, event_date: { $gte: today } }, groupBy: 'status', sum: ['quote_total', 'balance_due'], limit: 10 });
  const [booked, open] = await Promise.all([ahead(BOOKED), ahead(OPEN)]);
  return {
    booked_events: total(booked.rows, 'count'), booked_value: total(booked.rows, 'sum_quote_total'), balance_due: total(booked.rows, 'sum_balance_due'),
    open_events: total(open.rows, 'count'), open_value: total(open.rows, 'sum_quote_total'),
  };
}

// New clients are first-time clients, counted as Clients & Retention counts them.
async function crmFigures(svc, stamps, firstTime, range) {
  return { new_leads: await svc.entities.Lead.count({ created_date: stamps }), new_clients: firstTime(range) };
}

export async function executiveMetrics(ctx, input) {
  const svc = ctx.svc;
  const [{ today, period, comparison, stamps }, isOn] = await Promise.all([resolvePeriod(svc.entities, input), moduleSwitches(ctx)]);
  const compared = comparison.key !== 'budget', ids = reportBranches(ctx, input.branch_ids), where = ids.length ? { branch_id: { $in: ids } } : {};
  const off = (module) => ({ available: false, reason: 'module_off', module });
  const catering = isOn('catering')
    ? Promise.all([
      cateringFigures(svc, where, period, stamps.current),
      compared ? cateringFigures(svc, where, comparison, stamps.comparison) : null,
      cateringAhead(svc, where, today),
    ]).then(([current, previous, ahead]) => ({ available: true, current, previous, ahead }))
    : off('catering');
  const crm = isOn('crm')
    ? firstTimeCounter(ctx, where).then((firstTime) => Promise.all([crmFigures(svc, stamps.current, firstTime, period), compared ? crmFigures(svc, stamps.comparison, firstTime, comparison) : null]))
      .then(([current, previous]) => ({ available: true, current, previous }))
    : off('crm');
  return {
    today,
    period,
    comparison: { ...comparison, available: compared, reason: compared ? null : 'no_budget' },
    catering: await catering,
    crm: await crm,
  };
}