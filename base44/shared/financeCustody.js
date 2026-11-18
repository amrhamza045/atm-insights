import { requireValue } from './financeValidation.js';
import { financePermission } from './financeAccess.js';
import { companyPaymentMethods, paymentMethodOf } from './financePaymentMethodSource.js';
import { resolveMappingLines } from './financeBindingResolver.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

export async function listCustodies(ctx, company) {
  const branchIds = company.branch_ids || [];
  const [custodies, employees, methods, bindings] = await Promise.all([
    ctx.svc.entities.FinanceCustody.filter({ company_id: company.id }, { sort: '-opened_at', limit: 200 }),
    branchIds.length
      ? ctx.svc.entities.Employee.filter({ status: 'active', employment_type: { $ne: 'system_account' }, branch_id: { $in: branchIds } }, { limit: 200 })
      : Promise.resolve({ items: [] }),
    companyPaymentMethods(ctx.svc.entities, company),
    ctx.svc.entities.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: 'CUSTODY_CONTROL_ACC' }, { limit: 1 }),
  ]);
  const activeIds = custodies.items.filter((c) => c.status === 'active').map((c) => c.id);
  const entries = activeIds.length
    ? await ctx.svc.entities.FinanceCustodyEntry.filter({ custody_id: { $in: activeIds } }, { sort: '-entry_date', limit: 500 })
    : { items: [] };
  return {
    custodies: custodies.items,
    entries: entries.items,
    employees: employees.items,
    payment_methods: methods.filter((m) => m.is_active),
    mapped: bindings.items.length > 0,
  };
}

async function resolveCustodyJournal(ctx, company, custody, amount, date, paymentMethodCode, kind) {
  openFinanceDate(company, date);
  const m = paymentMethodOf(await companyPaymentMethods(ctx.svc.entities, company), paymentMethodCode);
  const drKey = kind === 'issue' || kind === 'replenishment' ? 'CUSTODY_CONTROL_ACC' : 'PAYMENT_METHOD_ACC';
  const crKey = kind === 'issue' || kind === 'replenishment' ? 'PAYMENT_METHOD_ACC' : 'CUSTODY_CONTROL_ACC';
  const resolved = await resolveMappingLines(
    ctx,
    company,
    [
      { account_key: drKey, debit: round(amount), credit: 0 },
      { account_key: crKey, debit: 0, credit: round(amount) },
    ],
    { date, dimensions: { branch_id: custody.branch_id, payment_method: m.code } }
  );
  const lines = await checkedAccounts(ctx, company, resolved.map((l) => ({ cost_center: custody.branch_id, ...l })), date);
  return { method: m, lines };
}

export async function openOrFundCustody(ctx, company, input, opts = {}) {
  if (!opts.skipPermCheck) financePermission(ctx, 'finance_accounts_manage');
  const amount = round(input.amount);
  requireValue(amount >= 0, 'Amount must be zero or positive.');
  requireValue(input.date, 'Entry date is required.');

  let custody;
  if (input.custody_id) {
    custody = await ctx.svc.entities.FinanceCustody.get(input.custody_id);
    requireValue(custody && custody.company_id === company.id && custody.status === 'active', 'Custody not found or already closed.');
    requireValue(amount > 0, 'Enter an amount greater than zero to replenish this custody.');
  } else {
    const emp = await ctx.svc.entities.Employee.get(input.employee_id);
    requireValue(emp && (company.branch_ids || []).includes(emp.branch_id), 'Select an active employee in this company.');
    const existing = await ctx.svc.entities.FinanceCustody.count({ company_id: company.id, employee_id: emp.id, status: 'active' });
    requireValue(existing === 0, `${emp.name} already has an active custody. Replenish or close it first.`);
    custody = await ctx.svc.entities.FinanceCustody.create({
      company_id: company.id,
      branch_id: emp.branch_id,
      branch_name: emp.branch_name || '',
      employee_id: emp.id,
      employee_name: emp.name,
      employee_email: emp.email || '',
      status: 'active',
      currency: company.currency,
      balance: 0,
      total_funded: 0,
      total_spent: 0,
      opened_at: new Date().toISOString(),
      opened_by: ctx.user.email,
      notes: input.notes || '',
    });
  }

  if (amount > 0) {
    const kind = input.custody_id ? 'replenishment' : 'issue';
    const { method, lines } = await resolveCustodyJournal(ctx, company, custody, amount, input.date, input.payment_method, kind);
    const entryId = crypto.randomUUID();
    const journal = await ctx.svc.entities.FinanceJournal.create({
      company_id: company.id,
      branch_id: custody.branch_id,
      entry_date: input.date,
      description: `${kind === 'issue' ? 'Issued' : 'Replenished'} staff custody · ${custody.employee_name}`,
      kind: 'manual',
      posting_key: `${company.id}:custody:${kind}:${entryId}`,
      status: 'posted',
      source_entity: 'FinanceCustody',
      source_id: custody.id,
      source_version: custody.updated_date || '',
      source_summary: { custody_id: custody.id, employee: custody.employee_name, payment_method: method.code },
      currency: company.currency,
      business_edition: company.edition,
      lines,
      prepared_by: 'Automatic (custody)',
      prepared_by_id: 'system',
      rule_version: 'custody-funding-v1',
      reviewed_by: ctx.user.email,
      reviewed_by_id: ctx.user.id,
      reviewed_at: new Date().toISOString(),
      review_note: `Funded via ${method.name}`,
      evidence_note: input.notes || '',
      total_debit: amount,
      total_credit: amount,
      is_test: !!company.is_test,
    });
    await projectFinanceJournal(ctx, company, journal);
    if (!method.has_transactions) await ctx.svc.entities.FinancePaymentMethod.update(method.id, { has_transactions: true });

    const newBalance = round(custody.balance + amount);
    custody = await ctx.svc.entities.FinanceCustody.update(custody.id, {
      balance: newBalance,
      total_funded: round(custody.total_funded + amount),
    });
    const entry = await ctx.svc.entities.FinanceCustodyEntry.create({
      entry_key: entryId,
      company_id: company.id,
      branch_id: custody.branch_id,
      custody_id: custody.id,
      employee_id: custody.employee_id,
      employee_name: custody.employee_name,
      kind,
      entry_date: input.date,
      delta: amount,
      balance_after: newBalance,
      currency: company.currency,
      source_entity: input.source_entity || 'FinanceCustody',
      source_id: input.source_id || custody.id,
      payment_method: method.code,
      payment_method_name: method.name,
      journal_id: journal.id,
      notes: input.notes || '',
      actor_email: ctx.user.email,
    });
    return { custody, journal, entry };
  }
  return { custody, journal: null, entry: null };
}

export async function returnOrCloseCustody(ctx, company, input, opts = {}) {
  if (!opts.skipPermCheck) financePermission(ctx, 'finance_accounts_manage');
  const amount = round(input.amount);
  requireValue(amount >= 0, 'Return amount must be zero or positive.');
  requireValue(input.date, 'Entry date is required.');

  let custody = await ctx.svc.entities.FinanceCustody.get(input.custody_id);
  requireValue(custody && custody.company_id === company.id && custody.status === 'active', 'Custody not found or already closed.');
  requireValue(round(custody.balance) + 1e-9 >= amount, `Cannot return more than the available balance (${company.currency} ${Number(custody.balance).toFixed(2)}).`);

  if (amount > 0) {
    const { method, lines } = await resolveCustodyJournal(ctx, company, custody, amount, input.date, input.payment_method, 'return');
    const entryId = crypto.randomUUID();
    const journal = await ctx.svc.entities.FinanceJournal.create({
      company_id: company.id,
      branch_id: custody.branch_id,
      entry_date: input.date,
      description: `Returned unused staff custody · ${custody.employee_name}`,
      kind: 'manual',
      posting_key: `${company.id}:custody:return:${entryId}`,
      status: 'posted',
      source_entity: 'FinanceCustody',
      source_id: custody.id,
      source_version: custody.updated_date || '',
      source_summary: { custody_id: custody.id, employee: custody.employee_name, payment_method: method.code },
      currency: company.currency,
      business_edition: company.edition,
      lines,
      prepared_by: 'Automatic (custody)',
      prepared_by_id: 'system',
      rule_version: 'custody-return-v1',
      reviewed_by: ctx.user.email,
      reviewed_by_id: ctx.user.id,
      reviewed_at: new Date().toISOString(),
      review_note: `Returned to ${method.name}`,
      evidence_note: input.notes || '',
      total_debit: amount,
      total_credit: amount,
      is_test: !!company.is_test,
    });
    await projectFinanceJournal(ctx, company, journal);
    if (!method.has_transactions) await ctx.svc.entities.FinancePaymentMethod.update(method.id, { has_transactions: true });

    const newBalance = round(custody.balance - amount);
    custody = await ctx.svc.entities.FinanceCustody.update(custody.id, { balance: newBalance });
    var returnJournal = journal;
    var returnEntry = await ctx.svc.entities.FinanceCustodyEntry.create({
      entry_key: entryId,
      company_id: company.id,
      branch_id: custody.branch_id,
      custody_id: custody.id,
      employee_id: custody.employee_id,
      employee_name: custody.employee_name,
      kind: 'return',
      entry_date: input.date,
      delta: -amount,
      balance_after: newBalance,
      currency: company.currency,
      source_entity: input.source_entity || 'FinanceCustody',
      source_id: input.source_id || custody.id,
      payment_method: method.code,
      payment_method_name: method.name,
      journal_id: journal.id,
      notes: input.notes || '',
      actor_email: ctx.user.email,
    });
  }

  if (input.close) {
    requireValue(round(custody.balance) === 0, 'Custody balance must be zero before closing.');
    custody = await ctx.svc.entities.FinanceCustody.update(custody.id, {
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes: `${custody.notes || ''}\nClosed by ${ctx.user.email}`.trim(),
    });
  }
  return { custody, journal: returnJournal || null, entry: returnEntry || null };
}

export async function assertSufficientCustody(ctx, company, custodyId, requiredTotal, date) {
  const custody = await ctx.svc.entities.FinanceCustody.get(custodyId);
  requireValue(custody && custody.company_id === company.id && custody.status === 'active', 'Selected staff custody is not active.');
  const bal = round(custody.balance), req = round(requiredTotal);
  requireValue(
    bal + 1e-9 >= req,
    `Insufficient custody balance for ${custody.employee_name}: available ${company.currency} ${bal.toFixed(2)}, required ${company.currency} ${req.toFixed(2)}.`
  );
  const resolved = await resolveMappingLines(
    ctx,
    company,
    [{ account_key: 'CUSTODY_CONTROL_ACC', debit: 0, credit: req || 1 }],
    { date, dimensions: { branch_id: custody.branch_id } }
  );
  const accounts = await checkedAccounts(ctx, company, resolved.map((l) => ({ cost_center: custody.branch_id, ...l })), date);
  return { custody, templateAccount: accounts[0] };
}

export async function deductCustodyBalance(ctx, company, custodyId, amount, date, meta) {
  const { custody, templateAccount } = await assertSufficientCustody(ctx, company, custodyId, amount, date);
  const req = round(amount);
  const newBalance = round(custody.balance - req);
  const updated = await ctx.svc.entities.FinanceCustody.update(custody.id, {
    balance: newBalance,
    total_spent: round(custody.total_spent + req),
  });
  const entry = await ctx.svc.entities.FinanceCustodyEntry.create({
    entry_key: crypto.randomUUID(),
    company_id: company.id,
    branch_id: custody.branch_id,
    custody_id: custody.id,
    employee_id: custody.employee_id,
    employee_name: custody.employee_name,
    kind: meta.kind || 'hr_payout',
    entry_date: date,
    delta: -req,
    balance_after: newBalance,
    currency: company.currency,
    source_entity: meta.source_entity,
    source_id: meta.source_id,
    payment_method: '',
    payment_method_name: '',
    journal_id: meta.journal_id || '',
    notes: meta.notes || '',
    actor_email: ctx.user.email,
  });
  return { custody: updated, account: { ...templateAccount, debit: 0, credit: req, cost_center: meta.cost_center || custody.branch_id }, entry };
}

export async function deductCustodyForHrPayout(ctx, company, custodyId, amount, date, meta) {
  return deductCustodyBalance(ctx, company, custodyId, amount, date, { ...meta, kind: 'hr_payout' });
}