import { requireValue, validDate } from './financeValidation.js';
import { companyPaymentMethods, paymentMethodOf } from './financePaymentMethodSource.js';
import { openOrFundCustody, returnOrCloseCustody } from './financeCustody.js';
import { audit } from './auditLog.js';

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function canViewCustody(ctx) {
  return Boolean(
    ctx.admin ||
      ctx.permissions.custody_view ||
      ctx.permissions.custody_manage ||
      ctx.permissions.custody_approve ||
      ctx.permissions.financial_view ||
      ctx.permissions.finance_edit
  );
}

export function canManageCustody(ctx) {
  return Boolean(
    ctx.admin ||
      ctx.permissions.custody_manage ||
      ctx.permissions.finance_edit ||
      ctx.permissions.finance_accounts_manage
  );
}

export function canApproveCustody(ctx) {
  return Boolean(ctx.admin || ctx.permissions.custody_approve);
}

export async function readCustodyModule(ctx, company, branchId = '') {
  requireValue(canViewCustody(ctx), 'You do not have permission to view Petty Cash & Custody.', 403);
  const branchIds = company.branch_ids || [];
  const scopedBranches = branchId && branchIds.includes(branchId) ? [branchId] : branchIds;

  const [custodies, requests, employees, methods, bindings, accounts] = await Promise.all([
    ctx.svc.entities.FinanceCustody.filter(
      { company_id: company.id, ...(branchId ? { branch_id: branchId } : {}) },
      { sort: '-opened_at', limit: 200 }
    ),
    ctx.svc.entities.FinanceCustodyRequest.filter(
      { company_id: company.id, ...(branchId ? { branch_id: branchId } : {}) },
      { sort: '-created_date', limit: 200 }
    ),
    scopedBranches.length
      ? ctx.svc.entities.Employee.filter(
          { status: 'active', employment_type: { $ne: 'system_account' }, branch_id: { $in: scopedBranches } },
          { limit: 200 }
        )
      : Promise.resolve({ items: [] }),
    companyPaymentMethods(ctx.svc.entities, company),
    ctx.svc.entities.FinanceAccountBinding.filter(
      { company_id: company.id, mapping_key: 'CUSTODY_CONTROL_ACC' },
      { sort: '-priority', limit: 10 }
    ),
    ctx.svc.entities.FinanceAccount.filter(
      { company_id: company.id, classification: 'assets', posting: true, active: true },
      { sort: 'code', limit: 200 }
    ),
  ]);

  const custodyIds = custodies.items.map((c) => c.id);
  const entries = custodyIds.length
    ? await ctx.svc.entities.FinanceCustodyEntry.filter({ custody_id: { $in: custodyIds } }, { sort: '-created_date', limit: 500 })
    : { items: [] };

  const activeBinding = bindings.items.find((b) => !b.effective_to) || bindings.items[0] || null;
  return {
    company: { id: company.id, name: company.name, currency: company.currency },
    custodies: custodies.items,
    entries: entries.items,
    requests: requests.items,
    employees: employees.items,
    payment_methods: methods.filter((m) => m.is_active),
    custody_binding: activeBinding,
    asset_accounts: accounts.items,
    permissions: {
      can_manage: canManageCustody(ctx),
      can_approve: canApproveCustody(ctx),
      can_configure: Boolean(ctx.admin || ctx.permissions.custody_manage || ctx.permissions.finance_accounts_manage),
      self_bypass: Boolean(ctx.permissions.approval_self_bypass),
    },
  };
}

export async function saveCustodyConfiguration(ctx, company, input) {
  requireValue(
    ctx.admin || ctx.permissions.custody_manage || ctx.permissions.finance_accounts_manage,
    'Configuring the Custody GL summary account requires Custody Management or Chart of Accounts permission.',
    403
  );
  requireValue(typeof input.account_id === 'string' && input.account_id, 'Select an active asset posting account.');
  const account = await ctx.svc.entities.FinanceAccount.get(input.account_id).catch(() => null);
  requireValue(
    account && account.company_id === company.id && account.active && account.posting && account.classification === 'assets',
    'Custody summary account must be an active asset posting account in this company.'
  );

  const existing = await ctx.svc.entities.FinanceAccountBinding.filter(
    { company_id: company.id, mapping_key: 'CUSTODY_CONTROL_ACC' },
    { sort: '-priority', limit: 10 }
  );
  const baseRule = existing.items.find((b) => !b.conditions || Object.keys(b.conditions).length === 0) || existing.items[0];
  const effectiveFrom = validDate(input.effective_from) ? input.effective_from : '2020-01-01';

  let saved;
  if (baseRule) {
    saved = await ctx.svc.entities.FinanceAccountBinding.update(baseRule.id, {
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      effective_from: baseRule.effective_from || effectiveFrom,
      notes: 'Unified Staff Custody GL summary account (configured in Petty Cash & Custody)',
    });
  } else {
    saved = await ctx.svc.entities.FinanceAccountBinding.create({
      company_id: company.id,
      mapping_key: 'CUSTODY_CONTROL_ACC',
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      conditions: {},
      priority: 100,
      effective_from: effectiveFrom,
      notes: 'Unified Staff Custody GL summary account (configured in Petty Cash & Custody)',
    });
  }

  await audit(ctx.base44, ctx.user, 'update', 'FinanceAccountBinding', `Configured CUSTODY_CONTROL_ACC to ${account.code} · ${account.name}`, {
    entityId: saved.id,
    changes: { account_id: account.id, account_code: account.code, account_name: account.name },
  });
  return { binding: saved };
}

export async function submitCustodyRequest(ctx, company, input) {
  requireValue(canManageCustody(ctx), 'You do not have permission to submit custody requests.', 403);
  const type = input.request_type;
  requireValue(['issue', 'replenishment', 'settlement'].includes(type), 'Choose issue, replenishment, or settlement.');
  requireValue(validDate(input.entry_date), 'Choose a valid accounting date.');
  const amount = round(input.amount);
  const closeAfter = Boolean(input.close_after_return);
  requireValue(amount >= 0, 'Amount cannot be negative.');
  if (type !== 'settlement' || !closeAfter) {
    requireValue(amount > 0, 'Enter an amount greater than zero.');
  }

  const bindings = await ctx.svc.entities.FinanceAccountBinding.filter(
    { company_id: company.id, mapping_key: 'CUSTODY_CONTROL_ACC' },
    { limit: 1 }
  );
  requireValue(bindings.items.length > 0, 'Configure the Unified Custody GL Summary Account in Configuration before submitting custody requests.');

  let method = null;
  if (amount > 0) {
    const methods = await companyPaymentMethods(ctx.svc.entities, company);
    method = paymentMethodOf(methods, input.payment_method);
    requireValue(method && method.is_active, 'Choose an active payment method.');
  }

  let empId = '', empName = '', branchId = '', branchName = '', custodyId = '';
  if (type === 'issue') {
    const emp = await ctx.svc.entities.Employee.get(input.employee_id).catch(() => null);
    requireValue(emp && (company.branch_ids || []).includes(emp.branch_id), 'Select an active employee in this company.');
    requireValue(ctx.admin || !ctx.permissions.branch_id || ctx.permissions.branch_id === emp.branch_id, 'Employee branch is outside your access.', 403);
    const activeCount = await ctx.svc.entities.FinanceCustody.count({ company_id: company.id, employee_id: emp.id, status: 'active' });
    requireValue(activeCount === 0, `${emp.name} already holds an active custody. Each staff member can hold only one active custody at a time.`);
    const pendingIssue = await ctx.svc.entities.FinanceCustodyRequest.count({
      company_id: company.id,
      employee_id: emp.id,
      request_type: 'issue',
      status: 'pending',
    });
    requireValue(pendingIssue === 0, `${emp.name} already has a pending custody opening request awaiting approval.`);
    empId = emp.id;
    empName = emp.name;
    branchId = emp.branch_id;
    branchName = emp.branch_name || '';
  } else {
    const custody = await ctx.svc.entities.FinanceCustody.get(input.custody_id).catch(() => null);
    requireValue(custody && custody.company_id === company.id && custody.status === 'active', 'Select an active staff custody.');
    requireValue(ctx.admin || !ctx.permissions.branch_id || ctx.permissions.branch_id === custody.branch_id, 'Custody branch is outside your access.', 403);
    if (type === 'settlement') {
      requireValue(
        round(custody.balance) + 1e-9 >= amount,
        `Return amount (${company.currency} ${amount.toFixed(2)}) exceeds ${custody.employee_name}'s available custody balance (${company.currency} ${round(custody.balance).toFixed(2)}).`
      );
      if (closeAfter) {
        requireValue(
          Math.abs(round(custody.balance - amount)) < 1e-9,
          `To close this custody, return the full remaining balance (${company.currency} ${round(custody.balance).toFixed(2)}).`
        );
      }
    }
    custodyId = custody.id;
    empId = custody.employee_id;
    empName = custody.employee_name;
    branchId = custody.branch_id;
    branchName = custody.branch_name || '';
  }

  const created = await ctx.svc.entities.FinanceCustodyRequest.create({
    company_id: company.id,
    branch_id: branchId,
    branch_name: branchName,
    request_type: type,
    custody_id: custodyId,
    employee_id: empId,
    employee_name: empName,
    entry_date: input.entry_date,
    amount,
    currency: company.currency,
    payment_method: method?.code || '',
    payment_method_name: method?.name || '',
    close_after_return: closeAfter,
    status: 'pending',
    notes: String(input.notes || '').trim().slice(0, 1000),
    requested_by: ctx.user.email,
    requested_by_id: ctx.user.id,
  });

  await audit(ctx.base44, ctx.user, 'create', 'FinanceCustodyRequest', `Submitted custody ${type} request for ${empName} (${company.currency} ${amount.toFixed(2)})`, {
    entityId: created.id,
    changes: { request_type: type, employee_name: empName, amount, payment_method: method?.code || '' },
  });

  return { request: created };
}

export async function decideCustodyRequest(ctx, company, input) {
  requireValue(canApproveCustody(ctx), 'Approving or rejecting custody requests requires the Custody Approvals permission in System Role Groups.', 403);
  const reqRecord = await ctx.svc.entities.FinanceCustodyRequest.get(input.request_id).catch(() => null);
  requireValue(reqRecord && reqRecord.company_id === company.id, 'Custody request not found in this company.', 404);
  requireValue(reqRecord.status === 'pending', `This request was already ${reqRecord.status}.`, 409);
  requireValue(ctx.admin || !ctx.permissions.branch_id || ctx.permissions.branch_id === reqRecord.branch_id, 'This branch is outside your approval scope.', 403);

  const isCreator =
    reqRecord.requested_by_id === ctx.user.id ||
    String(reqRecord.requested_by || '').toLowerCase() === String(ctx.user.email || '').toLowerCase();
  requireValue(
    !isCreator || ctx.permissions.approval_self_bypass === true,
    'Segregation of duties: a second authorized approver in System Role Groups must approve this custody request (unless Self-approve is enabled on your role).',
    403
  );

  if (input.decision === 'reject') {
    const reason = String(input.rejection_reason || '').trim();
    requireValue(reason.length >= 3, 'Provide a rejection reason (at least 3 characters).');
    const rejected = await ctx.svc.entities.FinanceCustodyRequest.update(reqRecord.id, {
      status: 'rejected',
      decided_by: ctx.user.email,
      decided_at: new Date().toISOString(),
      rejection_reason: reason,
    });
    await audit(ctx.base44, ctx.user, 'update', 'FinanceCustodyRequest', `Rejected custody ${reqRecord.request_type} request for ${reqRecord.employee_name}`, {
      entityId: rejected.id,
      changes: { status: 'rejected', rejection_reason: reason },
    });
    return { request: rejected };
  }

  requireValue(input.decision === 'approve', 'Choose approve or reject.');

  let execution;
  if (reqRecord.request_type === 'issue' || reqRecord.request_type === 'replenishment') {
    execution = await openOrFundCustody(
      ctx,
      company,
      {
        ...(reqRecord.request_type === 'replenishment' ? { custody_id: reqRecord.custody_id } : { employee_id: reqRecord.employee_id }),
        amount: reqRecord.amount,
        date: reqRecord.entry_date,
        payment_method: reqRecord.payment_method,
        notes: reqRecord.notes || `Approved custody ${reqRecord.request_type} request`,
        source_entity: 'FinanceCustodyRequest',
        source_id: reqRecord.id,
      },
      { skipPermCheck: true }
    );
  } else {
    execution = await returnOrCloseCustody(
      ctx,
      company,
      {
        custody_id: reqRecord.custody_id,
        amount: reqRecord.amount,
        date: reqRecord.entry_date,
        payment_method: reqRecord.payment_method,
        close: Boolean(reqRecord.close_after_return),
        notes: reqRecord.notes || 'Approved custody settlement',
        source_entity: 'FinanceCustodyRequest',
        source_id: reqRecord.id,
      },
      { skipPermCheck: true }
    );
  }

  const approved = await ctx.svc.entities.FinanceCustodyRequest.update(reqRecord.id, {
    status: 'approved',
    custody_id: execution.custody?.id || reqRecord.custody_id || '',
    decided_by: ctx.user.email,
    decided_at: new Date().toISOString(),
    journal_id: execution.journal?.id || '',
    custody_entry_id: execution.entry?.id || '',
  });

  await audit(
    ctx.base44,
    ctx.user,
    'update',
    'FinanceCustodyRequest',
    `Approved custody ${reqRecord.request_type} for ${reqRecord.employee_name}${isCreator ? ' (self-approved)' : ''}`,
    {
      entityId: approved.id,
      changes: {
        status: 'approved',
        amount: reqRecord.amount,
        custody_id: approved.custody_id,
        journal_id: approved.journal_id,
        self_approved: isCreator,
      },
    }
  );

  return { request: approved, custody: execution.custody };
}