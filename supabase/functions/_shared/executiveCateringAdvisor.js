import { readAll, cateringScope, replyHead, num, round } from './executiveCateringCommon.js';
import { readFilter, filterEvents } from './executiveCateringFilter.js';
import { policySchedule } from './paymentPolicyRules.js';
import { cateringPipeline } from './executiveCateringPipeline.js';
import { cateringPnl } from './executiveCateringPnl.js';
import { cateringLoss } from './executiveCateringLoss.js';
import { cateringVariance } from './executiveCateringVariance.js';
import { cateringFeedback } from './executiveCateringFeedback.js';
import { cateringEquipment } from './executiveCateringEquipment.js';

// Catering Advisor for the Executive Dashboard: fixed checks over the catering
// reports' own figures for the period, its comparison and the events ahead, so
// the same records always give the same findings, highest priority first. Each
// finding names the report it comes from; the dashboard words it.
const RANK = { high: 0, medium: 1, low: 2 };
const OWING = ['deposit_pending', 'confirmed', 'in_progress'];
const amount = (v) => num(v) ?? 0;
const sum = (rows, f) => round(rows.reduce((s, r) => s + (f(r) || 0), 0));
const first = (rows, pick) => rows.slice(0, 10).map(pick);
// Below the comparison by more than rounding.
const fell = (now, before) => now != null && before != null && now < before - 0.05;

// What an event should have paid by now under the payment policy saved on it
// (every step due before today, as its Payments tab works them out), beyond what it has paid.
function overdue(e, today) {
  const paid = amount(e.total_paid);
  if (!e.payment_policy?.schedule?.length || !e.payment_policy_booked_on) return { value: 0 };
  const schedule = policySchedule(e.payment_policy, { bookedOn: e.payment_policy_booked_on, eventDate: e.event_date, quoteTotal: amount(e.quote_total), grandTotal: paid + amount(e.balance_due) });
  const due = schedule.steps.map((s) => s.due_date).filter((d) => d < today).sort().pop();
  return due ? { value: Math.max(0, round(schedule.requiredBy(due) - paid)), due_by: due } : { value: 0 };
}

export async function overduePayments(ctx, scope, filter) {
  const rows = await readAll(ctx.svc.entities.CateringEvent, { ...scope.where, status: { $in: OWING }, event_date: { $gte: scope.today } });
  return (await filterEvents(ctx, rows, filter))
    .map((e) => ({ id: e.id, name: e.event_name || 'Untitled event', date: e.event_date, ...overdue(e, scope.today) }))
    .filter((e) => e.value > 0)
    .sort((a, b) => b.value - a.value);
}

function byStatus(loss, status, key, priority) {
  const rows = loss.events.filter((e) => e.status === status).sort((a, b) => b.shortfall - a.shortfall);
  return rows.length > 0 && {
    key, priority, report: 'lossanalysis', count: rows.length, amount: sum(rows, (e) => e.shortfall),
    events: first(rows, (e) => ({ id: e.id, name: e.name, date: e.date, margin_pct: e.margin_pct, target_pct: e.target_pct })),
  };
}

// Each check returns its finding, or false when it doesn't apply.
const CHECKS = [
  ({ pipeline: p }) => p.overdue.count > 0 && {
    key: 'overdue_events', priority: 'high', report: 'pipeline', count: p.overdue.count, amount: p.overdue.value,
    events: first(p.overdue.events, (e) => ({ id: e.id, name: e.name, date: e.date, stage: e.stage, value: e.value })),
  },
  ({ payments }) => payments.length > 0 && {
    key: 'payments_overdue', priority: 'high', report: 'pipeline', count: payments.length, amount: sum(payments, (e) => e.value), events: first(payments, (e) => e),
  },
  ({ pipeline: p }) => {
    const short = p.upcoming.filter((e) => e.booked && e.staff_required > e.staff_assigned);
    return short.length > 0 && {
      key: 'understaffed', priority: 'high', report: 'pipeline', count: short.length, extra: short.reduce((s, e) => s + e.staff_required - e.staff_assigned, 0),
      events: first(short, (e) => ({ id: e.id, name: e.name, date: e.date, staff_assigned: e.staff_assigned, staff_required: e.staff_required })),
    };
  },
  ({ loss }) => byStatus(loss, 'loss', 'loss_events', 'high'),
  ({ loss }) => byStatus(loss, 'underperforming', 'below_target', 'medium'),
  ({ variance: v }) => {
    const over = v.events.filter((e) => e.over > 0.5);
    return over.length > 0 && {
      key: 'over_estimate', priority: 'medium', report: 'costvariance', count: over.length, amount: sum(over, (e) => e.over), rate: v.current.cost_vs_estimate_pct,
      events: first(over, (e) => ({ id: e.id, name: e.name, date: e.date, over: e.over, over_pct: e.over_pct })),
    };
  },
  ({ pnl }) => pnl.unbilled + pnl.incomplete > 0 && {
    key: 'incomplete_records', priority: 'medium', report: 'catering', count: pnl.unbilled + pnl.incomplete, extra: { unbilled: pnl.unbilled, incomplete: pnl.incomplete },
  },
  ({ feedback: f }) => f.current.low_ratings > 0 && { key: 'low_ratings', priority: 'medium', report: 'clientfeedback', count: f.current.low_ratings, rate: f.current.client_rating },
  ({ pipeline: p }) => p.previous && fell(p.current.booking_conversion, p.previous.booking_conversion) && {
    key: 'conversion_down', priority: 'medium', report: 'pipeline', rate: p.current.booking_conversion, previous: p.previous.booking_conversion,
  },
  ({ pnl }) => pnl.previous && fell(pnl.current.event_margin_pct, pnl.previous.event_margin_pct) && {
    key: 'margin_down', priority: 'medium', report: 'catering', rate: pnl.current.event_margin_pct, previous: pnl.previous.event_margin_pct,
  },
  ({ pipeline: p }) => {
    const before = p.previous?.cancellations ?? 0;
    return p.current.cancellations > 0 && {
      key: 'cancellations', priority: p.current.cancellations > before ? 'medium' : 'low', report: 'pipeline',
      count: p.current.cancellations, amount: p.current.cancelled_value, extra: p.current.penalties_kept, previous: before,
    };
  },
  ({ pnl, feedback: f }) => {
    const missing = pnl.current.events_delivered - f.current.rated_events;
    return missing > 0 && { key: 'unrated', priority: 'low', report: 'clientfeedback', count: missing, extra: pnl.current.events_delivered };
  },
  ({ pnl }) => {
    const types = pnl.by_event_type.filter((s) => s.current.events_delivered > 0);
    const best = [...types].sort((a, b) => (b.current.event_margin ?? 0) - (a.current.event_margin ?? 0))[0];
    return types.length > 1 && best.current.event_margin > 0 && {
      key: 'top_event_type', priority: 'low', report: 'catering', name: best.label, count: best.current.events_delivered, amount: best.current.event_margin, rate: best.current.event_margin_pct,
    };
  },
];

// Checks on Equipment & Returns, run while Assets & Resources is switched on.
const EQUIPMENT_CHECKS = [
  ({ equipment: q }) => (q.current.damaged_missing > 0 || q.current.damage_loss_cost > 0) && {
    key: 'equipment_loss', priority: 'medium', report: 'cateringequipment', count: q.current.damaged_missing, amount: q.current.damage_loss_cost,
  },
  ({ equipment: q }) => {
    const pending = q.dispositions.find((d) => d.key === 'pending');
    return pending?.count > 0 && { key: 'returns_pending', priority: 'low', report: 'cateringequipment', count: pending.count, amount: pending.value };
  },
];

export async function cateringAdvisor(ctx, input) {
  const scope = await cateringScope(ctx, input);
  if (!scope.isOn('catering')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const withEquipment = scope.isOn('assets_resources');
  const [pipeline, pnl, loss, variance, feedback, equipment, payments] = await Promise.all([
    cateringPipeline(ctx, input), cateringPnl(ctx, input), cateringLoss(ctx, input), cateringVariance(ctx, input), cateringFeedback(ctx, input),
    withEquipment ? cateringEquipment(ctx, input) : null, overduePayments(ctx, scope, readFilter(input)),
  ]);
  const checks = withEquipment ? [...CHECKS, ...EQUIPMENT_CHECKS] : CHECKS;
  const figures = { pipeline, pnl, loss, variance, feedback, equipment, payments };
  const findings = checks.map((check) => check(figures)).filter(Boolean)
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || (b.amount ?? 0) - (a.amount ?? 0) || (b.count ?? 0) - (a.count ?? 0));
  return { ...replyHead(scope), available: true, checked: checks.length, findings };
}