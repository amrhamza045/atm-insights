import { readAll, linked, cateringScope, replyHead, segments, num, round } from './executiveCateringCommon.js';
import { readFilter, filterEvents } from './executiveCateringFilter.js';
import { rangeBuckets } from './executivePeriod.js';

// Catering Staffing for the Executive Dashboard: the confirmed, in-progress
// and delivered events of the picker's branches dated in the period, their
// staffing plans, their confirmed staff assignments with each shift's
// clock-in, and the ratings given to the staff, beside the comparison period.
// Every record is read on the server, so totals are never cut off. Clock-ins
// are only ever totalled, never shown per person.
const STAFFED = ['confirmed', 'in_progress', 'completed'];
const TYPES = { regular: 'Regular staff', temporary: 'Temporary staff', freelance: 'Freelancers' };
const ABSENT = ['absent', 'no_show', 'rejected_hr_confirmation'];
const amount = (v) => num(v) ?? 0;
const total = (rows, f) => round(rows.reduce((s, r) => s + (f(r) || 0), 0));
const share = (part, whole) => (whole > 0 ? (part / whole) * 100 : null);
const average = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : null);

// One confirmed assignment: what was planned and, on a delivered event, its clock-in.
function shift(a, delivered, clock) {
  const showed = delivered && !!clock?.sign_in_time && !ABSENT.includes(clock.status) && clock.review_status !== 'rejected';
  return {
    kind: 'shift', event: a.event_id, person: a.employee_id, name: a.employee_name || 'Unnamed', role: a.role_name || 'Unspecified',
    type: TYPES[a.employment_type] ? a.employment_type : 'regular', planned_hours: amount(a.expected_hours), planned_cost: amount(a.estimated_cost),
    delivered, showed, on_time: showed && clock.status !== 'late' && !(amount(clock.late_minutes) > 0),
    hours: showed ? amount(clock.hours_worked) : 0, pay: showed ? amount(clock.regular_earnings) + amount(clock.overtime_earnings) : 0,
  };
}

async function staffed(ctx, where, range, filter) {
  const E = ctx.svc.entities;
  const events = await filterEvents(ctx, await readAll(E.CateringEvent, { ...where, status: { $in: STAFFED }, event_date: { $gte: range.from, $lte: range.to } }), filter);
  const delivered = new Set(events.filter((e) => e.status === 'completed').map((e) => e.id));
  const [assignments, feedback] = await Promise.all([
    linked(E.CateringAssignment, 'event_id', events.map((e) => e.id), { status: 'confirmed' }),
    linked(E.CateringStaffFeedback, 'event_id', events.map((e) => e.id)),
  ]);
  const due = assignments.filter((a) => delivered.has(a.event_id) && a.shift_id).map((a) => a.shift_id);
  const clockIns = new Map((await linked(E.Attendance, 'shift_id', due)).map((c) => [c.shift_id, c]));
  return {
    events,
    shifts: assignments.map((a) => shift(a, delivered.has(a.event_id), clockIns.get(a.shift_id))),
    // A rating of 0 is a custody shortage still waiting for a manager's review.
    ratings: feedback.filter((f) => num(f.rating) > 0 && f.review_status !== 'pending_manager_review')
      .map((f) => ({ kind: 'rating', person: f.employee_id, role: f.role_name || 'Unspecified', rating: num(f.rating) })),
  };
}

function totalsOf({ events, shifts, ratings }) {
  const required = events.reduce((s, e) => s + amount(e.staffing_required_count), 0);
  const filled = events.reduce((s, e) => s + Math.min(amount(e.staffing_assigned_count), amount(e.staffing_required_count)), 0);
  const delivered = events.filter((e) => e.status === 'completed'), billed = delivered.filter((e) => amount(e.actual_revenue) > 0);
  const due = shifts.filter((s) => s.delivered), showed = due.filter((s) => s.showed);
  const labour = total(delivered, (e) => num(e.actual_labor_cost));
  return {
    roles_filled: share(filled, required), staff_shifts: shifts.length,
    attendance_rate: share(showed.length, due.length), on_time_rate: share(showed.filter((s) => s.on_time).length, showed.length),
    labour_cost: labour,
    labour_pct_revenue: share(total(billed, (e) => num(e.actual_labor_cost)), total(billed, (e) => num(e.actual_revenue))),
    labour_vs_plan: delivered.length ? round(labour - total(delivered, (e) => num(e.estimated_labor_cost))) : null,
    staff_rating: average(ratings.map((r) => r.rating)),
  };
}

// A role's shifts and ratings (shift and rating rows mixed).
function roleFigures(list) {
  const shifts = list.filter((r) => r.kind === 'shift'), due = shifts.filter((s) => s.delivered), showed = due.filter((s) => s.showed);
  return {
    staff_shifts: shifts.length, hours_worked: total(showed, (s) => s.hours), shift_pay: total(showed, (s) => s.pay),
    attendance_rate: share(showed.length, due.length), staff_rating: average(list.filter((r) => r.kind === 'rating').map((r) => r.rating)),
  };
}

// Everyone on the period's shifts, most events first, with the hours and cost
// planned on their assignments and their average rating.
function people(shifts, ratings) {
  const out = new Map();
  for (const s of shifts) {
    const p = out.get(s.person) || { id: s.person, name: s.name, type: TYPES[s.type], roles: {}, events: new Set(), hours: 0, cost: 0, rated: [] };
    p.roles[s.role] = (p.roles[s.role] || 0) + 1;
    p.events.add(s.event);
    p.hours += s.planned_hours;
    p.cost += s.planned_cost;
    out.set(s.person, p);
  }
  for (const r of ratings) out.get(r.person)?.rated.push(r.rating);
  return [...out.values()]
    .map((p) => ({
      id: p.id, name: p.name, type: p.type, role: Object.entries(p.roles).sort((a, b) => b[1] - a[1])[0][0],
      events: p.events.size, planned_hours: round(p.hours), planned_cost: round(p.cost), rating: average(p.rated), ratings: p.rated.length,
    }))
    .sort((a, b) => b.events - a.events || b.planned_hours - a.planned_hours);
}

export async function cateringStaffing(ctx, input) {
  const scope = await cateringScope(ctx, input), { unit, period, comparison, where } = scope, filter = readFilter(input);
  if (!scope.isOn('catering')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [now, before] = await Promise.all([staffed(ctx, where, period, filter), staffed(ctx, where, comparison, filter)]);
  const earlier = before.events.length ? before : null;
  const labourIn = (set, range) => rangeBuckets(range, unit).map((b) => total(set.events.filter((e) => e.status === 'completed' && e.event_date >= b.from && e.event_date <= b.to), (e) => num(e.actual_labor_cost)));
  const trend = labourIn(now, period), prior = earlier ? labourIn(earlier, comparison) : [];
  const mixed = (set) => [...set.shifts, ...set.ratings];
  return {
    ...replyHead(scope), available: true,
    has_activity: now.events.length > 0,
    incomplete: now.events.filter((e) => e.status === 'completed' && e.actual_cost_status !== 'complete').length,
    current: totalsOf(now), previous: earlier && totalsOf(earlier),
    trend: rangeBuckets(period, unit).map((b, i) => ({ from: b.from, current: trend[i], previous: earlier ? prior[i] ?? null : null })),
    types: Object.entries(TYPES).map(([key, label]) => { const list = now.shifts.filter((s) => s.type === key); return { key, label, count: list.length, value: total(list, (s) => s.pay) }; }),
    by_role: segments(mixed(now), earlier && mixed(earlier), 'role', roleFigures, 'staff_shifts'),
    people: people(now.shifts, now.ratings),
  };
}