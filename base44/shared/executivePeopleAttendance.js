import { replyHead, round } from './executiveCateringCommon.js';
import { pct, within } from './executiveSupplyCommon.js';
import { rangeBuckets } from './executivePeriod.js';
import { requireValue } from './financeValidation.js';
import { peopleScope, closed, roster, seesPeople, pooled, grouped, NO_DEPARTMENT, MIN_GROUP } from './executivePeople.js';

// Attendance & Hours for the Executive Dashboard: the clock-in records of the
// picked branches dated in the period, beside the comparison's, with the rules
// of the Dependability score on each employee's profile. Each record is a day
// someone was due: absent or no-show is a day missed; a manual clock-in still
// waiting for HR to confirm it (or refused) doesn't count; every other record
// was attended. On time: attended with no late minutes. Dependability:
// attended on time and for the whole shift ÷ days due. Totals are grouped on
// the server, so nothing is cut off.
const ABSENT = ['absent', 'no_show'];
const ATTENDED = { status: { $nin: [...ABSENT, 'pending_hr_confirmation', 'rejected_hr_confirmation'] } };
const SLIPPED = [{ late_minutes: { $gt: 0 } }, { early_leave_minutes: { $gt: 0 } }];
const TOO_MANY_PEOPLE = 'Too many people to total completely; no partial figures are shown.';
const COUNTS = ['attended', 'absent', 'late', 'late_minutes', 'early', 'slipped', 'hours', 'overtime'];

async function grouping(ctx, query, sumFields = []) {
  const r = await ctx.svc.entities.Attendance.aggregate({ query, groupBy: 'employee_id', sum: sumFields, limit: 1000 });
  requireValue(!r.truncated, TOO_MANY_PEOPLE);
  return r.rows;
}

// Each person's days attended, missed, late (and minutes), left early and
// late-or-early, hours and overtime hours in the range.
async function perPerson(ctx, where, range) {
  const q = { ...where, attendance_date: within(range) }, seen = { ...q, ...ATTENDED };
  const [attended, absent, late, early, slipped] = await Promise.all([
    grouping(ctx, seen, ['hours_worked', 'overtime_hours']), grouping(ctx, { ...q, status: { $in: ABSENT } }),
    grouping(ctx, { ...seen, late_minutes: { $gt: 0 } }, ['late_minutes']), grouping(ctx, { ...seen, early_leave_minutes: { $gt: 0 } }),
    grouping(ctx, { ...seen, $or: SLIPPED }),
  ]);
  const people = new Map(), at = (id) => people.get(id) || people.set(id, { id, ...Object.fromEntries(COUNTS.map((k) => [k, 0])) }).get(id);
  for (const r of attended) Object.assign(at(r.employee_id), { attended: r.count, hours: r.sum_hours_worked || 0, overtime: r.sum_overtime_hours || 0 });
  for (const r of absent) at(r.employee_id).absent = r.count;
  for (const r of late) Object.assign(at(r.employee_id), { late: r.count, late_minutes: r.sum_late_minutes || 0 });
  for (const r of early) at(r.employee_id).early = r.count;
  for (const r of slipped) at(r.employee_id).slipped = r.count;
  return [...people.values()];
}

const added = (list) => Object.fromEntries(COUNTS.map((k) => [k, list.reduce((s, p) => s + p[k], 0)]));

function figures(t) {
  const due = t.attended + t.absent;
  return {
    att_due: due, att_show_rate: pct(t.attended, due), att_on_time_rate: pct(t.attended - t.late, t.attended),
    att_dependability: pct(t.attended - t.slipped, due), att_hours: round(t.hours), att_overtime_hours: round(t.overtime),
    att_absences: t.absent, att_late: t.late, att_late_minutes: t.late ? round(t.late_minutes / t.late) : null, att_left_early: t.early,
  };
}

// Hours worked and the on-time share per day or month of the range.
async function cells(ctx, where, range, unit) {
  const by = (query, sumFields = []) => ctx.svc.entities.Attendance.aggregate(unit === 'day'
    ? { query, groupBy: 'attendance_date', sum: sumFields, limit: 1000 }
    : { query, dateBucket: { field: 'attendance_date', unit: 'month' }, sum: sumFields, limit: 1000 });
  const seen = { ...where, ...ATTENDED, attendance_date: within(range) };
  const [attended, late] = await Promise.all([by(seen, ['hours_worked']), by({ ...seen, late_minutes: { $gt: 0 } })]);
  const size = unit === 'day' ? 10 : 7, find = (rows, key) => rows.find((r) => String(r.attendance_date).slice(0, size) === key);
  return rangeBuckets(range, unit).map((b) => {
    const a = find(attended.rows, b.from.slice(0, size)), l = find(late.rows, b.from.slice(0, size));
    return { from: b.from, hours: a ? round(a.sum_hours_worked || 0) : 0, on_time: a ? pct(a.count - (l?.count || 0), a.count) : null };
  });
}

// Days attended and hours on catering event shifts in the period (the rest
// were regular shifts).
async function eventShifts(ctx, where, range) {
  const ids = [];
  let cursor = null;
  do {
    const page = await ctx.svc.entities.Shift.filter({ ...where, shift_source: 'catering', shift_date: within(range) }, { sort: 'id', limit: 1000, ...(cursor ? { cursor } : {}) });
    ids.push(...page.items.map((s) => s.id));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  const batches = [];
  for (let i = 0; i < ids.length; i += 500) batches.push(ids.slice(i, i + 500));
  const rows = (await Promise.all(batches.map((batch) => ctx.svc.entities.Attendance.aggregate({
    query: { ...where, ...ATTENDED, attendance_date: within(range), shift_id: { $in: batch } }, groupBy: 'branch_id', sum: ['hours_worked'], limit: 100,
  })))).flatMap((r) => r.rows);
  return { count: rows.reduce((s, r) => s + r.count, 0), hours: round(rows.reduce((s, r) => s + (r.sum_hours_worked || 0), 0)) };
}

const rowOf = (id, name, list, extra = {}) => ({ id, name, ...extra, ...figures(added(list)) });

export async function peopleAttendance(ctx, input) {
  const scope = await peopleScope(ctx, input, 'hr_attendance');
  if (scope.off) return closed(scope, 'module_off');
  const { where, period, comparison, unit } = scope;
  const [now, before, nowCells, beforeCells, events, waiting, staff] = await Promise.all([
    perPerson(ctx, where, period), perPerson(ctx, where, comparison), cells(ctx, where, period, unit), cells(ctx, where, comparison, unit),
    eventShifts(ctx, where, period), ctx.svc.entities.Attendance.count({ ...where, $or: [{ review_status: 'pending' }, { status: 'pending_hr_confirmation' }] }),
    roster(ctx, scope.offset),
  ]);
  const named = seesPeople(ctx), department = (p) => staff.get(p.id)?.department || NO_DEPARTMENT;
  // Without access to names, a selection of one or two people would show theirs.
  if (!named && now.length > 0 && now.length < MIN_GROUP) return closed(scope, 'too_few');
  const total = added(now), earlier = before.length >= (named ? 1 : MIN_GROUP) ? figures(added(before)) : null;
  const departments = grouped(now, department, department, (p) => p.id);
  return {
    ...replyHead(scope), available: true, has_activity: total.attended + total.absent > 0,
    current: { ...figures(total), att_waiting_review: waiting }, previous: earlier,
    trend: nowCells.map((c, i) => ({ from: c.from, current: c.hours, previous: earlier ? beforeCells[i]?.hours ?? null : null })),
    on_time_trend: nowCells.map((c, i) => ({ from: c.from, current: c.on_time, previous: earlier ? beforeCells[i]?.on_time ?? null : null })),
    shifts: [
      { key: 'event', label: 'Catering event shifts', count: events.count, value: events.hours },
      { key: 'regular', label: 'Regular shifts', count: total.attended - events.count, value: round(total.hours - events.hours) },
    ],
    // Departments of one or two people are pooled for anyone who can't see names.
    by_department: (named ? departments : pooled(departments)).map((g) => rowOf(g.key, g.label, g.rows, { people: g.people.size })).sort((a, b) => b.att_due - a.att_due),
    by_person: named
      ? now.filter((p) => p.attended + p.absent > 0).map((p) => rowOf(p.id, staff.get(p.id)?.name || 'Unknown person', [p], { department: department(p) }))
        .sort((a, b) => (a.att_dependability ?? 101) - (b.att_dependability ?? 101) || b.att_due - a.att_due)
      : null,
  };
}