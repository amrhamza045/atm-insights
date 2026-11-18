import { readAll, cateringScope, replyHead } from './executiveCateringCommon.js';
import { dayInOffset } from './companyTimezone.js';

// What the Executive Dashboard People reports share: their scope (dates,
// module switches, picked branches, currency), who may see people by name,
// the HR roster with each person's department and leaving day, and the rule
// that pay is only ever totalled for three people or more.
export const NO_DEPARTMENT = 'No department';
export const MIN_GROUP = 3;

// Dates, switches and branches as the catering reports open them; off is true
// while the report's own module is switched off.
export async function peopleScope(ctx, input, module) {
  const scope = await cateringScope(ctx, input);
  return { ...scope, off: !scope.isOn(module) };
}

export const closed = (scope, reason) => ({ ...replyHead(scope), available: false, reason });

// Branches the report covers (empty: all).
export const pickedBranches = (scope) => new Set(scope.where.branch_id?.$in || []);

// Names appear only for people who can already open HR records.
export const seesPeople = (ctx) => !!(ctx.admin || ctx.permissions.hr_view_all || ctx.permissions.hr_edit || ctx.permissions.hr_attendance_approve);

// Everyone HR has a record of, system accounts left out: current employees
// and removed ones. left is the company day each person left: the day HR
// removed their access (status Terminated), else the day they were removed;
// null while employed. Terminated before leaving days were saved: undated.
export async function roster(ctx, offset) {
  const E = ctx.svc.entities;
  const [staff, former] = await Promise.all([readAll(E.Employee, { employment_type: { $ne: 'system_account' } }), readAll(E.ExEmployee, {})]);
  const person = (p, id, status, left) => ({
    id, status, left, undated: status === 'terminated' && !left, name: p.name || 'Unnamed', department: p.department || NO_DEPARTMENT,
    type: p.employment_type || 'regular', branch_id: p.branch_id || '', branch_name: p.branch_name || '', hire: p.hire_date || null,
  });
  const people = new Map();
  for (const p of former) {
    if (p.employment_type === 'system_account') continue;
    const id = p.original_employee_id || p.id;
    people.set(id, person(p, id, 'removed', p.left_date || (p.deleted_at ? dayInOffset(p.deleted_at, offset) : null)));
  }
  for (const p of staff) people.set(p.id, person(p, p.id, p.status || 'active', p.status === 'terminated' ? p.left_date || null : null));
  return people;
}

// Groups for pay or attendance totals: a group of fewer than three people goes
// into "Other", which takes the next smallest group until it has three, so no
// total shows (or lets anyone work out) one or two people's figures.
// groups: [{ key, label, people: Set, rows }].
const headsOf = (list) => new Set(list.flatMap((g) => [...g.people])).size;
export function pooled(groups) {
  const shown = [...groups].sort((a, b) => a.people.size - b.people.size), small = [];
  while (shown.length && shown[0].people.size < MIN_GROUP) small.push(shown.shift());
  while (small.length && headsOf(small) < MIN_GROUP && shown.length) small.push(shown.shift());
  if (!small.length) return shown;
  const merged = { key: 'other', label: `Other (${small.map((g) => g.label).join(', ')})`, people: new Set(small.flatMap((g) => [...g.people])), rows: small.flatMap((g) => g.rows) };
  return [...shown, merged];
}

// rows grouped by keyOf, each group with its people (by personOf).
export function grouped(rows, keyOf, labelOf, personOf) {
  const groups = new Map();
  for (const r of rows) {
    const key = keyOf(r), g = groups.get(key) || { key, label: labelOf(r), people: new Set(), rows: [] };
    g.people.add(personOf(r));
    g.rows.push(r);
    groups.set(key, g);
  }
  return [...groups.values()];
}