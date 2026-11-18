import { readAll, replyHead, round } from './executiveCateringCommon.js';
import { pct, within } from './executiveSupplyCommon.js';
import { rangeBuckets } from './executivePeriod.js';
import { dayInOffset } from './companyTimezone.js';
import { peopleScope, closed, roster, seesPeople, pickedBranches, NO_DEPARTMENT, MIN_GROUP } from './executivePeople.js';

// Workforce for the Executive Dashboard: the HR roster of the picked branches
// (each person's current branch; removed people the branch they left from),
// system accounts left out. Employed on a day: hired by then (or no hire date)
// and not yet left. As of today: headcount, on leave included, by type,
// department and branch. In the period, beside the comparison's: hires (by
// hire date), leavers (by leaving day), turnover against the average
// headcount, appraisals decided (by decision day) with the average approved
// rating, and disciplinary actions (by action date). People set to Terminated
// before leaving days were saved have no leaving day, so they count nowhere.
const TYPES = [['regular', 'Regular'], ['temporary', 'Temporary'], ['freelance', 'Freelance']];
const ACTIONS = [['verbal_warning', 'Verbal warning'], ['warning_1', 'First warning'], ['warning_2', 'Second warning'], ['hearing_minutes', 'Hearing minutes']];

const employed = (p, day) => !p.undated && (!p.hire || p.hire <= day) && (!p.left || p.left > day);
const inRange = (day, range) => !!day && day >= range.from && day <= range.to;
const dayBefore = (day) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
const headcountOn = (people, day) => people.filter((p) => employed(p, day)).length;

function flow(people, range) {
  const leavers = people.filter((p) => inRange(p.left, range)).length;
  const average = (headcountOn(people, dayBefore(range.from)) + headcountOn(people, range.to)) / 2;
  return { wf_hires: people.filter((p) => inRange(p.hire, range)).length, wf_leavers: leavers, wf_turnover: average > 0 ? pct(leavers, average) : null };
}

async function decided(ctx, where, stamps, offset) {
  const rows = await readAll(ctx.svc.entities.PerformanceAppraisal, { ...where, status: { $in: ['approved', 'rejected'] }, decided_at: stamps });
  return rows.map((a) => ({
    id: a.id, person: a.employee_record_id, name: a.employee_name || 'Unnamed', approved: a.status === 'approved',
    rating: Number(a.rating) || null, from: a.period_start || '', to: a.period_end || '', day: a.decided_at ? dayInOffset(a.decided_at, offset) : '',
  }));
}

// Ratings are shown for three approved appraisals or more to anyone who can't see names.
function reviewFigures(list, named) {
  const rated = list.filter((a) => a.approved && a.rating), hidden = !named && rated.length > 0 && rated.length < MIN_GROUP;
  return { wf_appraisals: list.length, wf_rating: rated.length && !hidden ? round(rated.reduce((s, a) => s + a.rating, 0) / rated.length) : null, hidden };
}

// Headcount today, on leave today, hires and leavers in the range, per group.
function table(people, range, today, keyOf, labelOf) {
  const groups = new Map();
  for (const p of people) {
    const key = keyOf(p), g = groups.get(key) || { id: key || 'none', name: labelOf(p), headcount: 0, on_leave: 0, hires: 0, leavers: 0 };
    if (employed(p, today)) Object.assign(g, { headcount: g.headcount + 1, on_leave: g.on_leave + (p.status === 'on_leave' ? 1 : 0) });
    if (inRange(p.hire, range)) g.hires += 1;
    if (inRange(p.left, range)) g.leavers += 1;
    groups.set(key, g);
  }
  return [...groups.values()].filter((g) => g.headcount || g.hires || g.leavers).sort((a, b) => b.headcount - a.headcount || b.hires - a.hires);
}

const actionsIn = (ctx, where, range) => readAll(ctx.svc.entities.DisciplinaryAction, { ...where, action_date: within(range) });

export async function peopleWorkforce(ctx, input) {
  const scope = await peopleScope(ctx, input, 'hr_employees');
  if (scope.off) return closed(scope, 'module_off');
  const { where, period, comparison, stamps, offset, today, unit } = scope, branches = pickedBranches(scope), named = seesPeople(ctx);
  const [everyone, reviews, earlierReviews, waiting, actions, earlierActions] = await Promise.all([
    roster(ctx, offset), decided(ctx, where, stamps.current, offset), decided(ctx, where, stamps.comparison, offset),
    ctx.svc.entities.PerformanceAppraisal.count({ ...where, status: 'pending' }), actionsIn(ctx, where, period), actionsIn(ctx, where, comparison),
  ]);
  const people = [...everyone.values()].filter((p) => !branches.size || branches.has(p.branch_id)), staff = people.filter((p) => employed(p, today));
  const { hidden, ...now } = reviewFigures(reviews, named), { hidden: _, ...before } = reviewFigures(earlierReviews, named);
  const earlierBuckets = rangeBuckets(comparison, unit), approved = reviews.filter((a) => a.approved && a.rating);
  return {
    ...replyHead(scope), available: true, has_activity: people.length > 0,
    current: { wf_headcount: staff.length, wf_on_leave: staff.filter((p) => p.status === 'on_leave').length, ...flow(people, period), ...now, wf_discipline: actions.length },
    previous: { ...flow(people, comparison), ...before, wf_discipline: earlierActions.length },
    undated: people.filter((p) => p.undated).length,
    no_hire_date: staff.filter((p) => !p.hire).length,
    no_department: staff.filter((p) => p.department === NO_DEPARTMENT).length,
    trend: rangeBuckets(period, unit).map((b, i) => ({ from: b.from, current: headcountOn(people, b.to), previous: earlierBuckets[i] ? headcountOn(people, earlierBuckets[i].to) : null })),
    types: TYPES.map(([key, label]) => ({ key, label, count: staff.filter((p) => p.type === key).length, value: null })),
    by_department: table(people, period, today, (p) => p.department, (p) => p.department),
    by_branch: table(people, period, today, (p) => p.branch_id, (p) => p.branch_name || 'No branch'),
    appraisals: {
      waiting, ratings: hidden ? null : [5, 4, 3, 2, 1].map((rating) => ({ rating, count: approved.filter((a) => Math.round(a.rating) === rating).length })),
      rows: named ? reviews.map((a) => ({ ...a, department: everyone.get(a.person)?.department || NO_DEPARTMENT })).sort((a, b) => (a.day < b.day ? 1 : -1)) : null,
    },
    discipline: ACTIONS.map(([key, label]) => ({ key, label, count: actions.filter((a) => a.action_type === key).length, value: null })),
  };
}