import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { TIMEZONE_MISSING } from '../../shared/companyTimezone.js';
import { audit } from '../../shared/auditLog.js';
import { holdsSelfApprovalBypass, auditSelfApproval } from '../../shared/selfApprovalBypass.js';
import {
  POLICY_KEY, loadPolicy, validatePolicy, windowsForEmployee, getCompanyOffset, monthlySalary,
} from '../../shared/borrowingPolicy.js';

const bad = (error: string, status = 400) => Response.json({ error }, { status });

/** Past requests (newest first) and the employee's typical advance amount (most repeated, else median). */
async function historyFor(svc: any, employeeId: string) {
  const rows = (await svc.EmployeeBorrowing.filter({ employee_id: employeeId }))
    .sort((a: any, b: any) => String(b.borrow_date).localeCompare(String(a.borrow_date)));
  const history = rows.map((b: any) => ({
    id: b.id, amount: b.amount, reason: b.reason || '', borrow_date: b.borrow_date,
    status: b.request_status || (b.status === 'cancelled' ? 'cancelled' : 'approved'),
    repayment_status: b.status, remaining_balance: b.remaining_balance,
  }));
  const amounts = rows.filter((b: any) => b.request_status !== 'rejected' && b.status !== 'cancelled').map((b: any) => Number(b.amount)).filter((n: number) => n > 0);
  let typical: number | null = null;
  if (amounts.length) {
    const counts = new Map<number, number>();
    amounts.forEach((n: number) => counts.set(n, (counts.get(n) || 0) + 1));
    const [topAmount, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    const sorted = [...amounts].sort((a, b) => a - b);
    typical = topCount > 1 ? topAmount : sorted[Math.floor(sorted.length / 2)];
  }
  return { history, typical_amount: typical, request_count: amounts.length };
}

async function policyInfo(svc: any, employeeId: string) {
  const policy = await loadPolicy(svc);
  let info: any = { salary: null, windows: [] };
  if (policy.enabled) {
    const offset = await getCompanyOffset(svc);
    if (offset === null) return { error: TIMEZONE_MISSING };
    info = await windowsForEmployee(svc, employeeId, policy, offset);
  } else {
    info.salary = await monthlySalary(svc, employeeId);
  }
  return { policy, info };
}

/** Validates against the policy and creates the borrowing. extra = request-only fields; onCreated logs it. */
async function createBorrowing(svc: any, employee: any, policy: any, info: any, d: any, extra: any, onCreated: (record: any) => Promise<void>) {
  const amount = Number(d.amount);
  if (!Number.isFinite(amount) || amount <= 0) return bad('Amount must be greater than zero.');
  if (!d.borrow_date) return bad('Borrow date is required.');
  if (policy.enabled) {
    if (!info.salary) return bad('This employee has no monthly salary on file, so the advance limit cannot be calculated.');
    const w = info.windows.find((x: any) => x.date === d.borrow_date);
    if (!w) return bad('Borrow date must be one of the configured disbursement dates.');
    if (!w.open) return bad(`Requests for ${w.date} closed at ${w.cutoff_at}.`);
    if (amount > w.allowed + 0.001) {
      return bad(`Amount exceeds the limit for this window: EGP ${w.allowed.toFixed(2)} available (window ${w.percent}% = EGP ${w.window_limit.toFixed(2)}, monthly cap ${policy.max_percent_of_salary}% = EGP ${w.month_cap.toFixed(2)}).`);
    }
  }
  const months = parseInt(d.installment_months) || 1;
  const lump = d.repayment_type === 'lump_sum';
  const record = await svc.EmployeeBorrowing.create({
    employee_id: employee.id,
    employee_name: employee.name || '',
    amount,
    reason: d.reason || '',
    borrow_date: d.borrow_date,
    repayment_type: lump ? 'lump_sum' : 'installments',
    installment_months: months,
    amount_per_installment: lump ? amount : amount / months,
    start_repayment_month: d.start_repayment_month,
    remaining_balance: amount,
    total_repaid: 0,
    branch_id: extra.branch_id ?? d.branch_id ?? employee.branch_id,
    branch_name: extra.branch_name ?? d.branch_name ?? employee.branch_name,
    ...extra.fields,
  });
  await onCreated(record);
  return Response.json({ ok: true, id: record.id });
}

/** HR salary-advance policy: policy, limits, HR-recorded borrowings, employee self-requests and their review. */
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return bad('Unauthorized', 401);
    const svc = base44.asServiceRole.entities;
    const body = await req.json();
    const { action } = body;

    // ---- Employee self-service: identity comes from the signed-in user, never from the request ----
    if (action === 'myOptions' || action === 'myRequest') {
      const matches = await svc.Employee.filter({ email: user.email });
      const employee = matches.find((e: any) => !['terminated', 'inactive'].includes(e.status) && e.employment_type !== 'system_account');
      if (!employee) return bad('No employee record is linked to your account.', 404);
      const pi: any = await policyInfo(svc, employee.id);
      if (pi.error) return bad(pi.error);
      if (action === 'myOptions') {
        const h = await historyFor(svc, employee.id);
        return Response.json({ employee: { id: employee.id, name: employee.name }, policy: pi.policy, ...pi.info, ...h });
      }
      const d = body.data || {};
      const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 1);
      return createBorrowing(svc, employee, pi.policy, pi.info, {
        amount: d.amount, reason: d.reason, borrow_date: d.borrow_date,
        repayment_type: d.repayment_type, installment_months: d.installment_months,
        start_repayment_month: d.start_repayment_month || `${next.toISOString().slice(0, 7)}-01`,
      }, {
        branch_id: employee.branch_id, branch_name: employee.branch_name,
        fields: { request_status: 'pending', requested_by_employee: true, status: 'active' },
      }, (rec) => audit(base44, user, 'create', 'EmployeeBorrowing',
        `${employee.name} requested a salary advance of EGP ${rec.amount}`, { entityId: rec.id, entityName: employee.name }));
    }

    const denied = await denyUnlessPermitted(base44, user, 'hr_edit');
    if (denied) return denied;

    if (action === 'getPolicy') return Response.json({ policy: await loadPolicy(svc) });

    if (action === 'savePolicy') {
      const p = body.policy || {};
      const clean = {
        setting_key: POLICY_KEY,
        enabled: p.enabled !== false,
        max_percent_of_salary: Number(p.max_percent_of_salary),
        min_notice_hours: Number(p.min_notice_hours),
        windows: (p.windows || []).map((w: any) => ({
          day: Number(w.day), percent: Number(w.percent),
          cutoff_days_before: Number(w.cutoff_days_before), cutoff_time: String(w.cutoff_time || ''),
        })),
      };
      const err = validatePolicy(clean);
      if (err) return bad(err);
      const [existing] = await svc.BorrowingPolicy.filter({ setting_key: POLICY_KEY });
      const saved = existing ? await svc.BorrowingPolicy.update(existing.id, clean) : await svc.BorrowingPolicy.create(clean);
      await audit(base44, user, existing ? 'update' : 'create', 'BorrowingPolicy',
        `Saved the salary-advance policy (${clean.enabled ? 'on' : 'off'}, max ${clean.max_percent_of_salary}% of salary, ${clean.windows.length} window(s))`,
        { entityId: saved.id, changes: { before: existing || null, after: clean } });
      return Response.json({ ok: true, id: saved.id });
    }

    // ---- Reviewer context: salary + history + typical amount ----
    if (action === 'reviewContext') {
      const employeeId = body.employee_id;
      if (!employeeId) return bad('employee_id is required');
      const [salary, h] = await Promise.all([monthlySalary(svc, employeeId), historyFor(svc, employeeId)]);
      return Response.json({ salary, ...h });
    }

    // ---- Approve / reject an employee request ----
    if (action === 'decide') {
      const rec = await svc.EmployeeBorrowing.get(body.id);
      if (!rec || rec.request_status !== 'pending') return bad('This request is not pending.', 404);
      const emp = await svc.Employee.get(rec.employee_id);
      const ownRequest = !!emp && String(emp.email || '').toLowerCase() === String(user.email || '').toLowerCase();
      if (ownRequest && !await holdsSelfApprovalBypass(base44.asServiceRole, user)) {
        return bad('You cannot decide on your own advance request.', 403);
      }
      const stamp = { decision_by: user.email, decision_date: new Date().toISOString() };
      if (body.decision === 'approve') {
        // Stage 1 Approval: No payment method chosen yet! Set payout_status so Finance chooses in Payouts.
        await svc.EmployeeBorrowing.update(rec.id, { request_status: 'approved', payout_status: 'unpaid', ...stamp });
      } else if (body.decision === 'reject') {
        await svc.EmployeeBorrowing.update(rec.id, { request_status: 'rejected', status: 'cancelled', rejection_reason: String(body.reason || ''), ...stamp });
      } else return bad('Decision must be approve or reject.');
      await audit(base44, user, body.decision === 'approve' ? 'approve' : 'reject', 'EmployeeBorrowing',
        `${body.decision === 'approve' ? 'Approved' : 'Rejected'} ${rec.employee_name}'s salary advance request of EGP ${rec.amount}${body.decision === 'reject' && body.reason ? ` (reason: ${String(body.reason)})` : ''}`,
        { entityId: rec.id, entityName: rec.employee_name });
      if (ownRequest && body.decision === 'approve') {
        await auditSelfApproval(base44.asServiceRole, user, 'EmployeeBorrowing', rec.id, `own salary advance request of EGP ${rec.amount}`);
      }
      return Response.json({ ok: true });
    }

    if (action === 'options' || action === 'create') {
      const employeeId = body.employee_id;
      if (!employeeId) return bad('employee_id is required');
      const employee = await svc.Employee.get(employeeId);
      if (!employee) return bad('Employee not found', 404);
      const pi: any = await policyInfo(svc, employeeId);
      if (pi.error) return bad(pi.error);
      if (action === 'options') return Response.json({ policy: pi.policy, ...pi.info });
      return createBorrowing(svc, employee, pi.policy, pi.info, body.data || {}, { fields: { request_status: 'approved', payout_status: 'unpaid' } },
        (rec) => audit(base44, user, 'create', 'EmployeeBorrowing',
          `Recorded a salary advance of EGP ${rec.amount} for ${employee.name}`, { entityId: rec.id, entityName: employee.name }));
    }

    return bad('Unknown action');
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}