import { readAll, replyHead, round } from './executiveCateringCommon.js';
import { amount, sum, pct } from './executiveSupplyCommon.js';
import { peopleScope, closed, roster, pooled, grouped, MIN_GROUP, NO_DEPARTMENT } from './executivePeople.js';
import { payrollLedger } from './executivePeopleLedger.js';

// Labor Cost for the Executive Dashboard: the payroll HR has run for the picked
// branches, a whole month at a time — every month whose first day falls in the
// period — beside the comparison's months, in the same order. Payroll cost is
// what staff earned: gross pay (base salary, hourly and overtime pay, less
// late and early deductions) plus bonuses; penalties, advances recovered and
// other deductions come off it to give the net paid. Pay is only totalled for
// three people or more, so a selection with one or two people paid shows none.
// Every record is read on the server, so totals are never cut off.
const PAY = ['base', 'hourly', 'overtime', 'docked', 'gross', 'bonus', 'cost', 'penalties', 'advances', 'other', 'net', 'hours', 'overtime_hours'];

// "YYYY-MM" of every month whose first day is in the range.
export function monthsOf(range) {
  const out = [], d = new Date(`${range.from.slice(0, 7)}-01T00:00:00Z`);
  for (let first = d.toISOString().slice(0, 10); first <= range.to; d.setUTCMonth(d.getUTCMonth() + 1), first = d.toISOString().slice(0, 10)) {
    if (first >= range.from) out.push(first.slice(0, 7));
  }
  return out;
}

function payOf(r) {
  const gross = amount(r.gross_salary), bonus = amount(r.bonus);
  return {
    employee_id: r.employee_id || r.id, month: String(r.month || '').slice(0, 7), branch_id: r.branch_id || '', branch_name: r.branch_name || '',
    paid: r.payment_status === 'paid', base: amount(r.base_salary), hourly: amount(r.hourly_earnings), overtime: amount(r.overtime_earnings),
    docked: amount(r.attendance_deductions), gross, bonus, cost: gross + bonus, penalties: amount(r.penalty_deductions),
    advances: amount(r.borrowing_deductions), other: amount(r.deductions), net: amount(r.net_salary),
    hours: amount(r.total_hours), overtime_hours: amount(r.overtime_hours),
  };
}

async function payroll(ctx, where, months) {
  if (!months.length) return [];
  const rows = await readAll(ctx.svc.entities.SalaryRecord, { ...where, month: { $gte: `${months[0]}-01`, $lte: `${months.at(-1)}-31` } });
  return rows.map(payOf).filter((p) => months.includes(p.month));
}

const heads = (list) => new Set(list.map((p) => p.employee_id)).size;

// Labour charged to the delivered events of the months, as Event P&L records it.
async function eventLabour(ctx, scope, months) {
  if (!scope.isOn('catering') || !months.length) return null;
  const events = await readAll(ctx.svc.entities.CateringEvent, { ...scope.where, status: 'completed', event_date: { $gte: `${months[0]}-01`, $lte: `${months.at(-1)}-31` } });
  return sum(events.filter((e) => months.includes(String(e.event_date).slice(0, 7))), (e) => e.actual_labor_cost);
}

// Staff advances still to be repaid today (approved ones), for three people or more.
async function advancesOwed(ctx, where) {
  const owed = (await readAll(ctx.svc.entities.EmployeeBorrowing, { ...where, status: 'active' })).filter((b) => !b.request_status || b.request_status === 'approved');
  const people = new Set(owed.map((b) => b.employee_id)).size;
  return people > 0 && people < MIN_GROUP ? null : sum(owed, (b) => b.remaining_balance);
}

function figures(list, revenue, labour) {
  const cost = sum(list, (p) => p.cost), hours = sum(list, (p) => p.hours);
  return {
    labor_payroll_cost: cost,
    labor_net_paid: sum(list, (p) => p.net),
    labor_revenue_share: revenue > 0 ? pct(cost, revenue) : null,
    labor_event_share: labour === null ? null : pct(labour, cost),
    labor_overtime_cost: sum(list, (p) => p.overtime),
    labor_cost_per_hour: hours > 0 ? round(cost / hours) : null,
    labor_people_paid: heads(list),
  };
}

const totals = (list) => Object.fromEntries(PAY.map((k) => [k, sum(list, (p) => p[k])]));

// Pay by department or branch, smallest groups pooled, highest cost first.
function payGroups(list, keyOf, labelOf, total) {
  return pooled(grouped(list, keyOf, labelOf, (p) => p.employee_id)).map((g) => {
    const cost = sum(g.rows, (p) => p.cost), personMonths = new Set(g.rows.map((p) => `${p.employee_id}:${p.month}`)).size;
    return { id: g.key, name: g.label, people: g.people.size, cost, overtime: sum(g.rows, (p) => p.overtime), share: pct(cost, total), per_person_month: round(cost / personMonths) };
  }).sort((a, b) => b.cost - a.cost);
}

// The payroll cost of the ledger's own branches beside the staff cost posted.
function ledgerCheck(ledger, list) {
  if (!ledger.available) return { available: false, reason: ledger.reason };
  const operational = sum(list.filter((p) => ledger.owned.has(p.branch_id)), (p) => p.cost);
  if (ledger.posted === null) return { available: false, reason: 'no_accounts', company: ledger.company, operational };
  return { available: true, company: ledger.company, operational, balance: ledger.posted };
}

export async function peopleLabor(ctx, input) {
  const scope = await peopleScope(ctx, input, 'hr_payroll');
  if (scope.off) return closed(scope, 'module_off');
  if (!ctx.admin && !ctx.permissions.financial_view) return closed(scope, 'no_access');
  const months = monthsOf(scope.period), earlierMonths = monthsOf(scope.comparison);
  const [now, before, owed, staff] = await Promise.all([payroll(ctx, scope.where, months), payroll(ctx, scope.where, earlierMonths), advancesOwed(ctx, scope.where), roster(ctx, scope.offset)]);
  if (heads(now) > 0 && heads(now) < MIN_GROUP) return closed(scope, 'too_few');
  const paid = new Set(now.map((p) => p.month)), paidBefore = new Set(before.map((p) => p.month)), counted = months.filter((m) => paid.has(m));
  // The comparison counts only when every month counted has its matching
  // month paid as well (like with like), and only for three people or more.
  const matching = months.flatMap((m, i) => (paid.has(m) ? [earlierMonths[i]] : []));
  const compared = matching.length && matching.every((m) => m && paidBefore.has(m)) ? before.filter((p) => matching.includes(p.month)) : [];
  const earlier = heads(compared) >= MIN_GROUP ? compared : null, countedBefore = earlier ? matching : [];
  const [ledger, labour, labourBefore] = await Promise.all([payrollLedger(ctx, input, counted, countedBefore), eventLabour(ctx, scope, counted), eventLabour(ctx, scope, countedBefore)]);
  const cost = sum(now, (p) => p.cost), monthCost = (list, m) => sum(list.filter((p) => p.month === m), (p) => p.cost);
  const department = (p) => staff.get(p.employee_id)?.department || NO_DEPARTMENT;
  return {
    ...replyHead(scope), unit: 'month', available: true, has_activity: now.length > 0,
    current: { ...figures(now, ledger.available ? ledger.revenue : null, labour), labor_advances_owed: owed },
    previous: earlier && figures(earlier, ledger.available ? ledger.earlier_revenue : null, labourBefore),
    months: { counted, missing: months.filter((m) => !paid.has(m)) },
    not_paid: now.filter((p) => !p.paid).length,
    // The comparison has payroll, but not for the same months (or for fewer than three people).
    comparison_partial: !earlier && before.length > 0,
    revenue_reason: ledger.available ? null : ledger.reason,
    makeup: totals(now),
    trend: months.map((m, i) => ({
      from: `${m}-01`, current: paid.has(m) ? monthCost(now, m) : null,
      previous: earlier && paid.has(m) ? monthCost(earlier, earlierMonths[i]) : null,
    })),
    by_department: payGroups(now, department, department, cost),
    by_branch: payGroups(now, (p) => p.branch_id, (p) => p.branch_name || 'No branch', cost),
    ledger: ledgerCheck(ledger, now),
  };
}