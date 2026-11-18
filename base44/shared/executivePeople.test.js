import test from 'node:test';
import assert from 'node:assert/strict';

// The reports run on the backend runtime; outside it no secret is set.
globalThis.Deno ??= { env: { get: () => '' } };
const { default: fixture } = await import('./executiveLedgerFixture.js');
const { pooled } = await import('./executivePeople.js');
const { peopleLabor, monthsOf } = await import('./executivePeopleLabor.js');
const { peopleAttendance } = await import('./executivePeopleAttendance.js');
const { peopleWorkforce } = await import('./executivePeopleWorkforce.js');

const query = { period: 'mtd', compare: 'previous', branch_ids: [] };
const at = (day, time = '09:00:00') => `${day}T${time}.000Z`;
const analyst = (f) => Object.assign(f.ctx, { admin: false, permissions: { analytics_view: true } });
const staff = (e, rows) => e.Employee.rows.push(...rows.map(([id, department, extra = {}]) => ({ id, name: id.toUpperCase(), department, branch_id: 'b1', employment_type: 'regular', status: 'active', ...extra })));

test('whole months count from their first day, and small groups pool until three people', () => {
  assert.deepEqual(monthsOf({ from: '2026-01-01', to: '2026-03-15' }), ['2026-01', '2026-02', '2026-03']);
  assert.deepEqual(monthsOf({ from: '2026-01-15', to: '2026-03-15' }), ['2026-02', '2026-03']);
  const g = (label, ...people) => ({ key: label, label, people: new Set(people), rows: [] });
  assert.deepEqual(pooled([g('Kitchen', 1, 2, 3), g('HR', 4), g('Service', 5, 6)]).map((x) => [x.label, x.people.size]), [['Kitchen', 3], ['Other (HR, Service)', 3]]);
  assert.deepEqual(pooled([g('Kitchen', 1, 2, 3), g('HR', 4)]).map((x) => [x.label, x.people.size]), [['Other (HR, Kitchen)', 4]]);
});

// This month six people are paid: three in the kitchen at Downtown, one in HR
// and two in service at Airport (one still unpaid). Last month three were.
function payroll(options) {
  const f = fixture(options), { entities: e, dates, line } = f, month = `${dates.from.slice(0, 7)}-01`, earlier = `${dates.previous.slice(0, 7)}-01`;
  staff(e, [['e1', 'Kitchen'], ['e2', 'Kitchen'], ['e3', 'Kitchen'], ['e4', 'Human Resources'], ['e5', 'Service'], ['e6', 'Service']]);
  const pay = (employee_id, branch, m, gross, extra = {}) => e.SalaryRecord.rows.push({ employee_id, branch_id: branch, branch_name: branch === 'b1' ? 'Downtown' : 'Airport', month: m, gross_salary: gross, base_salary: gross, net_salary: gross, total_hours: 100, payment_status: 'paid', ...extra });
  pay('e1', 'b1', month, 1050, { base_salary: 1000, overtime_earnings: 100, attendance_deductions: 50, bonus: 50, penalty_deductions: 20, borrowing_deductions: 30, net_salary: 1050, overtime_hours: 5 });
  pay('e2', 'b1', month, 2000, { total_hours: 160 });
  pay('e3', 'b1', month, 1500, { base_salary: 0, hourly_earnings: 1500, total_hours: 150 });
  pay('e4', 'b2', month, 3000, { deductions: 50, net_salary: 2950, total_hours: 160, payment_status: 'pending' });
  pay('e5', 'b2', month, 1000, { total_hours: 80 });
  pay('e6', 'b2', month, 1000, { total_hours: 80 });
  for (const [id, gross] of [['e1', 1000], ['e2', 1500], ['e3', 1500]]) pay(id, 'b1', earlier, gross);
  e.CateringEvent.rows.push({ id: 'ev', branch_id: 'b1', status: 'completed', event_date: dates.from, actual_labor_cost: 960 });
  e.EmployeeBorrowing.rows.push(
    { employee_id: 'e1', branch_id: 'b1', status: 'active', request_status: 'approved', remaining_balance: 300 },
    { employee_id: 'e2', branch_id: 'b1', status: 'active', remaining_balance: 200 },
    { employee_id: 'e4', branch_id: 'b2', status: 'active', request_status: 'approved', remaining_balance: 500 },
    { employee_id: 'e5', branch_id: 'b2', status: 'active', request_status: 'pending', remaining_balance: 999 },
  );
  line('b1', dates.from, '410100', 0, 4800000);
  return f;
}

test('labor cost totals whole payroll months: cost is gross plus bonuses, beside revenue, events and advances', async () => {
  const r = await peopleLabor(payroll().ctx, query);
  assert.equal(r.available, true);
  assert.deepEqual(r.current, { labor_payroll_cost: 9600, labor_net_paid: 9500, labor_revenue_share: 20, labor_event_share: 10, labor_overtime_cost: 100, labor_cost_per_hour: 13.15, labor_people_paid: 6, labor_advances_owed: 1000 });
  assert.equal(r.previous.labor_payroll_cost, 4000);
  assert.equal(r.not_paid, 1);
  assert.deepEqual([r.makeup.gross, r.makeup.bonus, r.makeup.cost, r.makeup.docked, r.makeup.net], [9550, 50, 9600, 50, 9500]);
  assert.deepEqual(r.by_department.map((g) => [g.name, g.people, g.cost]), [['Other (Human Resources, Service)', 3, 5000], ['Kitchen', 3, 4600]]);
  assert.deepEqual(r.by_branch.map((g) => [g.name, g.cost]), [['Airport', 5000], ['Downtown', 4600]]);
  assert.deepEqual(r.trend.map((t) => [t.current, t.previous]), [[9600, 4000]]);
  assert.deepEqual(r.ledger, { available: false, reason: 'no_accounts', company: 'Rosemary', operational: 9600 });
});

test('labor cost puts payroll beside the mapped staff-cost accounts', async () => {
  const f = payroll();
  f.entities.FinanceAccountBinding.rows.push({ company_id: 'c', mapping_key: 'ADMIN_SALARIES_EXPENSE', account_id: '610100' });
  f.line('b2', f.dates.from, '610100', 900000, 0);
  const r = await peopleLabor(f.ctx, query);
  assert.deepEqual(r.ledger, { available: true, company: 'Rosemary', operational: 9600, balance: 9000 });
});

test('labor cost shows no pay for one or two people, and needs financial viewing', async () => {
  const f = payroll();
  f.entities.SalaryRecord.rows.splice(2, 4);
  assert.equal((await peopleLabor(f.ctx, query)).reason, 'too_few');
  assert.equal((await peopleLabor(analyst(payroll()), query)).reason, 'no_access');
});

// This month: E1 attends once on time and once late and misses a day; E2
// attends twice (one event shift, one cut short with an hour of overtime); E3
// attends once and has a manual clock-in HR hasn't confirmed. Last month E1
// attended once.
function attendance(options) {
  const f = fixture(options), { entities: e, dates } = f;
  staff(e, [['e1', 'Kitchen'], ['e2', 'Kitchen'], ['e3', 'Human Resources']]);
  const clock = (employee_id, status, extra = {}) => e.Attendance.rows.push({ employee_id, branch_id: 'b1', attendance_date: dates.from, status, hours_worked: 8, review_status: 'approved', ...extra });
  clock('e1', 'completed');
  clock('e1', 'late', { late_minutes: 10 });
  clock('e1', 'absent', { hours_worked: 0 });
  clock('e2', 'completed', { shift_id: 's1' });
  clock('e2', 'completed', { early_leave_minutes: 30, overtime_hours: 1, review_status: 'pending' });
  clock('e3', 'completed');
  clock('e3', 'pending_hr_confirmation', { review_status: 'pending' });
  clock('e1', 'completed', { attendance_date: dates.previous });
  e.Shift.rows.push({ id: 's1', branch_id: 'b1', shift_source: 'catering', shift_date: dates.from });
  return f;
}

test('attendance follows the dependability rules and lists people only for HR viewers', async () => {
  const r = await peopleAttendance(attendance().ctx, query);
  assert.deepEqual(r.current, { att_due: 6, att_show_rate: 83.33, att_on_time_rate: 80, att_dependability: 50, att_hours: 40, att_overtime_hours: 1, att_absences: 1, att_late: 1, att_late_minutes: 10, att_left_early: 1, att_waiting_review: 2 });
  assert.deepEqual([r.previous.att_due, r.previous.att_show_rate], [1, 100]);
  assert.deepEqual(r.shifts.map((s) => [s.key, s.count, s.value]), [['event', 1, 8], ['regular', 4, 32]]);
  assert.deepEqual(r.by_department.map((d) => [d.name, d.att_due]), [['Kitchen', 5], ['Human Resources', 1]]);
  assert.deepEqual(r.by_person.map((p) => [p.name, p.att_dependability]), [['E1', 33.33], ['E2', 50], ['E3', 100]]);
  const seen = await peopleAttendance(analyst(attendance()), query);
  assert.equal(seen.by_person, null);
  assert.deepEqual(seen.by_department.map((d) => [d.name, d.people]), [['Other (Human Resources, Kitchen)', 3]]);
  assert.equal(seen.previous, null);
});

// W1 has been here for years; W2 was hired this month; W3 is on leave with no
// hire date; W4 left this month; W5 was terminated before leaving days were
// saved; X1 was removed last month.
function workforce() {
  const f = fixture(), { entities: e, dates } = f;
  staff(e, [
    ['w1', 'Kitchen', { hire_date: '2020-01-01' }], ['w2', 'Kitchen', { hire_date: dates.from, employment_type: 'freelance' }],
    ['w3', 'Service', { status: 'on_leave', branch_id: 'b2' }], ['w4', 'Kitchen', { hire_date: '2021-01-01', status: 'terminated', left_date: dates.from }],
    ['w5', 'Kitchen', { status: 'terminated' }], ['w6', '', { employment_type: 'system_account' }],
  ]);
  e.ExEmployee.rows.push({ id: 'x', original_employee_id: 'x1', name: 'X1', department: 'Service', branch_id: 'b2', employment_type: 'regular', hire_date: '2019-05-01', deleted_at: at(dates.previous, '10:00:00') });
  const review = (status, rating, day = dates.from) => e.PerformanceAppraisal.rows.push({ employee_record_id: 'w1', employee_name: 'W1', branch_id: 'b1', status, rating, decided_at: status === 'pending' ? undefined : at(day) });
  review('approved', 4); review('approved', 5); review('rejected', 2); review('approved', 3); review('pending', 4); review('approved', 2, dates.previous);
  e.DisciplinaryAction.rows.push({ branch_id: 'b1', action_type: 'verbal_warning', action_date: dates.from }, { branch_id: 'b1', action_type: 'warning_1', action_date: dates.from }, { branch_id: 'b1', action_type: 'warning_1', action_date: dates.previous });
  return f;
}

test('workforce counts headcount today, hires, leavers and turnover from hire and leaving days', async () => {
  const r = await peopleWorkforce(workforce().ctx, query);
  assert.deepEqual(r.current, { wf_headcount: 3, wf_on_leave: 1, wf_hires: 1, wf_leavers: 1, wf_turnover: 33.33, wf_appraisals: 4, wf_rating: 4, wf_discipline: 2 });
  assert.deepEqual(r.previous, { wf_hires: 0, wf_leavers: 1, wf_turnover: 28.57, wf_appraisals: 1, wf_rating: 2, wf_discipline: 1 });
  assert.deepEqual([r.undated, r.no_hire_date, r.no_department], [1, 1, 0]);
  assert.deepEqual(r.types.map((t) => t.count), [2, 0, 1]);
  assert.deepEqual(r.by_department.map((d) => [d.name, d.headcount, d.on_leave, d.hires, d.leavers]), [['Kitchen', 2, 0, 1, 1], ['Service', 1, 1, 0, 0]]);
  assert.equal(r.appraisals.waiting, 1);
  assert.equal(r.appraisals.rows.length, 4);
  const seen = await peopleWorkforce(analyst(workforce()), query);
  assert.deepEqual([seen.appraisals.rows, seen.previous.wf_rating, seen.current.wf_rating], [null, null, 4]);
});