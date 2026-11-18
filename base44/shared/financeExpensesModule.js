import { requireValue, validDate, validateLines } from './financeValidation.js';
import { companyPaymentMethods, paymentMethodOf } from './financePaymentMethodSource.js';
import { loadMappingBindings, resolveAccountBinding } from './financeBindingResolver.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';
import { assertSufficientCustody, deductCustodyBalance } from './financeCustody.js';
import { assertExpenseAccount, listExpenseTypes } from './financeExpenseTypes.js';
import { withSupplierLock, supplierBalance, supplierPendingGuard } from './supplierAccountsAccess.js';
import { paymentMethodAccount } from './financePaymentMethodRules.js';
import { audit } from './auditLog.js';

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function canViewExpenses(ctx) {
  return Boolean(
    ctx.admin ||
      ctx.permissions.expenses_view ||
      ctx.permissions.expenses_edit ||
      ctx.permissions.expenses_config ||
      ctx.permissions.expense_approve ||
      ctx.permissions.financial_view ||
      ctx.permissions.finance_edit
  );
}

export function canEditExpenses(ctx) {
  return Boolean(ctx.admin || ctx.permissions.expenses_edit || ctx.permissions.finance_edit);
}

export function canApproveExpenses(ctx) {
  return Boolean(ctx.admin || ctx.permissions.expense_approve);
}

async function computeSupplierBalances(ctx, company, branchId, suppliers) {
  if (!branchId || !suppliers.length) return { balances: {}, invoices: [] };
  const [ledgerAgg, invoicesPage] = await Promise.all([
    ctx.svc.entities.SupplierLedgerEntry.aggregate({
      query: { company_id: company.id, branch_id: branchId, status: 'posted' },
      groupBy: 'supplier_id',
      sum: ['delta'],
      limit: 500,
    }),
    ctx.svc.entities.PurchaseInvoice.filter(
      { branch_id: branchId, status: { $ne: 'draft' } },
      { sort: '-invoice_date', limit: 200 }
    ),
  ]);
  const balances = Object.fromEntries(
    (ledgerAgg.rows || []).map((r) => [r.supplier_id, round(r.sum_delta)])
  );
  return { balances, invoices: invoicesPage.items };
}

export async function readExpensesModule(ctx, company, branchId = '') {
  requireValue(canViewExpenses(ctx), 'You do not have permission to view the Expenses module.', 403);
  const effectiveBranch = branchId && (company.branch_ids || []).includes(branchId) ? branchId : (company.branch_ids || [])[0] || '';

  const [expenseTypes, disbursements, custodies, methods, suppliersPage, expenseAccounts, apBindings, branchesPage] = await Promise.all([
    listExpenseTypes(ctx, company),
    ctx.svc.entities.FinanceExpenseDisbursement.filter(
      { company_id: company.id, ...(branchId ? { branch_id: branchId } : {}) },
      { sort: '-created_date', limit: 200 }
    ),
    ctx.svc.entities.FinanceCustody.filter(
      { company_id: company.id, status: 'active' },
      { sort: 'employee_name', limit: 200 }
    ),
    companyPaymentMethods(ctx.svc.entities, company),
    ctx.svc.entities.Supplier.filter({ is_active: { $ne: false } }, { sort: 'name', limit: 200 }),
    ctx.svc.entities.FinanceAccount.filter(
      { company_id: company.id, classification: { $in: ['operating_expenses', 'cogs', 'other_result'] }, posting: true, active: true },
      { sort: 'code', limit: 300 }
    ),
    ctx.svc.entities.FinanceAccountBinding.filter(
      { company_id: company.id, mapping_key: 'VENDOR_AP_ACCOUNT' },
      { sort: '-priority', limit: 5 }
    ),
    (company.branch_ids || []).length
      ? ctx.svc.entities.Branch.filter({ id: { $in: company.branch_ids } }, { limit: 50 })
      : Promise.resolve({ items: [] }),
  ]);

  const { balances, invoices } = await computeSupplierBalances(ctx, company, effectiveBranch, suppliersPage.items);

  return {
    company: { id: company.id, name: company.name, currency: company.currency },
    branches: branchesPage.items.map((b) => ({ id: b.id, name: b.name })),
    selected_branch_id: effectiveBranch,
    expense_types: expenseTypes,
    disbursements: disbursements.items,
    custodies: custodies.items,
    payment_methods: methods.filter((m) => m.is_active),
    suppliers: suppliersPage.items.map((s) => ({
      id: s.id,
      name: s.name,
      verified_balance: balances[s.id] || 0,
    })),
    open_invoices: invoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      supplier_id: inv.supplier_id,
      invoice_date: inv.invoice_date,
      total_amount: inv.total_amount,
    })),
    expense_accounts: expenseAccounts.items,
    vendor_ap_mapped: apBindings.items.length > 0,
    permissions: {
      can_edit: canEditExpenses(ctx),
      can_approve: canApproveExpenses(ctx),
      can_configure: Boolean(ctx.admin || ctx.permissions.expenses_config || ctx.permissions.finance_accounts_manage),
      self_bypass: Boolean(ctx.permissions.approval_self_bypass),
    },
  };
}

export async function submitExpenseDisbursement(ctx, company, input) {
  requireValue(canEditExpenses(ctx), 'You do not have permission to record expense or vendor disbursements.', 403);
  const kind = input.disbursement_kind || 'operating_expense';
  requireValue(['operating_expense', 'vendor_payment'].includes(kind), 'Choose operating expense or vendor payment.');
  requireValue(validDate(input.entry_date), 'Choose a valid accounting date.');
  openFinanceDate(company, input.entry_date);

  const branchId = String(input.branch_id || '').trim();
  requireValue(branchId && (company.branch_ids || []).includes(branchId), 'Select a branch belonging to this company.');
  requireValue(ctx.admin || !ctx.permissions.branch_id || ctx.permissions.branch_id === branchId, 'This branch is outside your access.', 403);
  const branch = await ctx.svc.entities.Branch.get(branchId).catch(() => null);

  const amount = round(input.amount);
  requireValue(amount > 0, 'Disbursement amount must be greater than zero.');
  const description = String(input.description || '').trim();
  requireValue(description.length >= 3 && description.length <= 1000, 'Enter a description or explanation (3–1000 characters).');

  // Validate funding source (Custody vs Payment Method)
  const sourceType = input.source_type;
  requireValue(['custody', 'payment_method'].includes(sourceType), 'Select Paid From: Staff Custody or Payment Method.');

  let custody = null, method = null;
  if (sourceType === 'custody') {
    requireValue(input.custody_id, 'Select an active staff custody.');
    const check = await assertSufficientCustody(ctx, company, input.custody_id, amount, input.entry_date);
    custody = check.custody;
  } else {
    const methods = await companyPaymentMethods(ctx.svc.entities, company);
    method = paymentMethodOf(methods, input.payment_method);
    requireValue(method && method.is_active, 'Select an active payment method.');
  }

  let expenseType = null, expAccount = null, supplier = null, invoice = null;
  if (kind === 'operating_expense') {
    requireValue(input.expense_type_id, 'Select a configured Expense Type.');
    expenseType = await ctx.svc.entities.FinanceExpenseType.get(input.expense_type_id).catch(() => null);
    requireValue(expenseType && expenseType.company_id === company.id && expenseType.is_active, 'Select an active Expense Type in this company.');
    expAccount = await ctx.svc.entities.FinanceAccount.get(expenseType.account_id).catch(() => null);
    assertExpenseAccount(company, expAccount);
  } else {
    requireValue(input.supplier_id, 'Select an active supplier.');
    supplier = await ctx.svc.entities.Supplier.get(input.supplier_id).catch(() => null);
    requireValue(supplier && supplier.is_active !== false, 'Selected supplier is inactive or not found.');
    const sCtx = { svc: ctx.svc, query: { company_id: company.id, branch_id: branchId, supplier_id: supplier.id } };
    const totalOwed = await supplierBalance(sCtx);
    requireValue(totalOwed > 0, `${supplier.name} has no verified payable balance on the Supplier Subledger in this branch.`);
    requireValue(amount <= totalOwed + 1e-9, `Payment (${company.currency} ${amount.toFixed(2)}) exceeds ${supplier.name}'s verified balance (${company.currency} ${totalOwed.toFixed(2)}).`);
    if (input.invoice_id) {
      invoice = await ctx.svc.entities.PurchaseInvoice.get(input.invoice_id).catch(() => null);
      requireValue(invoice && invoice.supplier_id === supplier.id && invoice.branch_id === branchId, 'Selected invoice does not belong to this supplier and branch.');
      const invRem = await supplierBalance(sCtx, { invoice_id: invoice.id });
      requireValue(amount <= invRem + 1e-9, `Payment exceeds the verified unpaid balance on invoice ${invoice.invoice_number} (${company.currency} ${invRem.toFixed(2)}).`);
      requireValue(input.entry_date >= invoice.invoice_date, 'Payment date cannot precede the invoice date.');
    }
  }

  const created = await ctx.svc.entities.FinanceExpenseDisbursement.create({
    company_id: company.id,
    branch_id: branchId,
    branch_name: branch?.name || '',
    disbursement_kind: kind,
    entry_date: input.entry_date,
    amount,
    currency: company.currency,
    expense_type_id: expenseType?.id || '',
    expense_type_code: expenseType?.code || '',
    expense_type_name: expenseType?.name || '',
    expense_account_id: expAccount?.id || '',
    expense_account_code: expAccount?.code || '',
    expense_account_name: expAccount?.name || '',
    recipient: String(input.recipient || supplier?.name || '').trim().slice(0, 200),
    supplier_id: supplier?.id || '',
    supplier_name: supplier?.name || '',
    invoice_id: invoice?.id || '',
    invoice_number: invoice?.invoice_number || '',
    source_type: sourceType,
    custody_id: custody?.id || '',
    custody_holder_name: custody?.employee_name || '',
    payment_method: method?.code || '',
    payment_method_name: method?.name || '',
    reference: String(input.reference || '').trim().slice(0, 120),
    description,
    status: 'pending',
    requested_by: ctx.user.email,
    requested_by_id: ctx.user.id,
  });

  await audit(
    ctx.base44,
    ctx.user,
    'create',
    'FinanceExpenseDisbursement',
    `Submitted ${kind === 'vendor_payment' ? `vendor payment for ${supplier.name}` : `expense (${expenseType.name})`} (${company.currency} ${amount.toFixed(2)})`,
    {
      entityId: created.id,
      changes: { kind, amount, source_type: sourceType, custody_id: custody?.id || '', payment_method: method?.code || '' },
    }
  );

  return { disbursement: created };
}

async function resolveDisbursementCredit(ctx, company, rec) {
  if (rec.source_type === 'custody') {
    const deducted = await deductCustodyBalance(ctx, company, rec.custody_id, rec.amount, rec.entry_date, {
      kind: rec.disbursement_kind === 'vendor_payment' ? 'vendor_payment' : 'expense_disbursement',
      source_entity: 'FinanceExpenseDisbursement',
      source_id: rec.id,
      cost_center: rec.branch_id,
      notes: `${rec.disbursement_kind === 'vendor_payment' ? `Vendor: ${rec.supplier_name}` : rec.expense_type_name} · ${rec.description}`,
    });
    return {
      creditLine: deducted.account,
      custodyEntry: deducted.entry,
      sourceLabel: `Custody · ${deducted.custody.employee_name}`,
      method: null,
    };
  }

  const methods = await companyPaymentMethods(ctx.svc.entities, company);
  const m = paymentMethodOf(methods, rec.payment_method);
  requireValue(m && m.is_active, 'Payment method is no longer active.');
  const pmAcc = await ctx.svc.entities.FinanceAccount.get(m.account_id).catch(() => null);
  paymentMethodAccount(company, pmAcc);
  if (!m.has_transactions) await ctx.svc.entities.FinancePaymentMethod.update(m.id, { has_transactions: true });

  const checked = await checkedAccounts(
    ctx,
    company,
    [{ account_id: pmAcc.id, debit: 0, credit: round(rec.amount), cost_center: rec.branch_id }],
    rec.entry_date
  );
  return {
    creditLine: checked[0],
    custodyEntry: null,
    sourceLabel: `Payment Method · ${m.name}`,
    method: m,
  };
}

export async function decideExpenseDisbursement(ctx, company, input) {
  requireValue(canApproveExpenses(ctx), 'Approving or rejecting disbursements requires the Expenses Approval permission in System Role Groups.', 403);
  const rec = await ctx.svc.entities.FinanceExpenseDisbursement.get(input.disbursement_id).catch(() => null);
  requireValue(rec && rec.company_id === company.id, 'Disbursement record not found in this company.', 404);
  requireValue(rec.status === 'pending', `This disbursement was already ${rec.status}.`, 409);
  requireValue(ctx.admin || !ctx.permissions.branch_id || ctx.permissions.branch_id === rec.branch_id, 'This branch is outside your approval scope.', 403);

  const isCreator =
    rec.requested_by_id === ctx.user.id ||
    String(rec.requested_by || '').toLowerCase() === String(ctx.user.email || '').toLowerCase();
  requireValue(
    !isCreator || ctx.permissions.approval_self_bypass === true,
    'Segregation of duties: a second authorized approver in System Role Groups must approve this disbursement (unless Self-approve is enabled on your role).',
    403
  );

  if (input.decision === 'reject') {
    const reason = String(input.rejection_reason || '').trim();
    requireValue(reason.length >= 3, 'Provide a rejection reason (at least 3 characters).');
    const rejected = await ctx.svc.entities.FinanceExpenseDisbursement.update(rec.id, {
      status: 'rejected',
      decided_by: ctx.user.email,
      decided_at: new Date().toISOString(),
      rejection_reason: reason,
    });
    await audit(ctx.base44, ctx.user, 'update', 'FinanceExpenseDisbursement', `Rejected disbursement (${rec.description})`, {
      entityId: rejected.id,
      changes: { status: 'rejected', rejection_reason: reason },
    });
    return { disbursement: rejected };
  }

  requireValue(input.decision === 'approve', 'Choose approve or reject.');
  openFinanceDate(company, rec.entry_date);
  const amount = round(rec.amount);

  if (rec.disbursement_kind === 'operating_expense') {
    const expType = await ctx.svc.entities.FinanceExpenseType.get(rec.expense_type_id).catch(() => null);
    requireValue(expType && expType.company_id === company.id, 'Configured Expense Type not found.');
    const expAcc = await ctx.svc.entities.FinanceAccount.get(expType.account_id).catch(() => null);
    assertExpenseAccount(company, expAcc);

    const debitChecked = await checkedAccounts(
      ctx,
      company,
      [{ account_id: expAcc.id, debit: amount, credit: 0, cost_center: rec.branch_id }],
      rec.entry_date
    );
    const { creditLine, custodyEntry, sourceLabel } = await resolveDisbursementCredit(ctx, company, rec);
    const lines = [debitChecked[0], creditLine];
    validateLines(lines, company.currency_decimals);

    const journal = await ctx.svc.entities.FinanceJournal.create({
      company_id: company.id,
      branch_id: rec.branch_id,
      entry_date: rec.entry_date,
      description: `Expense · ${expType.name} · ${rec.description}`,
      kind: 'automatic',
      posting_key: `${company.id}:expense-disbursement:${rec.id}`,
      status: 'posted',
      source_entity: 'FinanceExpenseDisbursement',
      source_id: rec.id,
      source_version: rec.updated_date || '',
      source_summary: {
        disbursement_kind: 'operating_expense',
        expense_type: expType.name,
        expense_code: expType.code,
        paid_from: sourceLabel,
        recipient: rec.recipient || '',
        reference: rec.reference || '',
      },
      currency: company.currency,
      business_edition: company.edition,
      lines,
      prepared_by: rec.requested_by,
      prepared_by_id: rec.requested_by_id || 'system',
      rule_version: 'expenses-module-v1',
      reviewed_by: ctx.user.email,
      reviewed_by_id: ctx.user.id,
      reviewed_at: new Date().toISOString(),
      review_note: `Approved via Expenses module (${sourceLabel})`,
      evidence_note: rec.reference || rec.description,
      total_debit: amount,
      total_credit: amount,
      is_test: !!company.is_test,
    });
    await projectFinanceJournal(ctx, company, journal);
    if (custodyEntry) {
      await ctx.svc.entities.FinanceCustodyEntry.update(custodyEntry.id, { journal_id: journal.id });
    }

    const approved = await ctx.svc.entities.FinanceExpenseDisbursement.update(rec.id, {
      status: 'approved',
      decided_by: ctx.user.email,
      decided_at: new Date().toISOString(),
      journal_id: journal.id,
      custody_entry_id: custodyEntry?.id || '',
    });

    await audit(ctx.base44, ctx.user, 'update', 'FinanceExpenseDisbursement', `Approved expense ${expType.name} (${company.currency} ${amount.toFixed(2)}) via ${sourceLabel}`, {
      entityId: approved.id,
      changes: { status: 'approved', journal_id: journal.id, paid_from: sourceLabel, self_approved: isCreator },
    });
    return { disbursement: approved, journal };
  }

  // Vendor payment from Custody or Payment Method -> settles verified Supplier Subledger + GL
  const supplier = await ctx.svc.entities.Supplier.get(rec.supplier_id).catch(() => null);
  requireValue(supplier && supplier.is_active !== false, 'Supplier is inactive or missing.');
  const sCtx = {
    base44: ctx.base44,
    svc: ctx.svc,
    company,
    supplier,
    user: ctx.user,
    branch: rec.branch_id,
    query: { company_id: company.id, branch_id: rec.branch_id, supplier_id: supplier.id },
  };

  return withSupplierLock(sCtx, async () => {
    const entryKey = `treasury-disbursement:${rec.id}`;
    await supplierPendingGuard(sCtx, [entryKey]);

    const totalOwed = await supplierBalance(sCtx);
    requireValue(amount <= totalOwed + 1e-9, `Payment exceeds ${supplier.name}'s current verified balance (${company.currency} ${totalOwed.toFixed(2)}).`);
    if (rec.invoice_id) {
      const invRem = await supplierBalance(sCtx, { invoice_id: rec.invoice_id });
      requireValue(amount <= invRem + 1e-9, `Payment exceeds remaining balance on invoice ${rec.invoice_number} (${company.currency} ${invRem.toFixed(2)}).`);
    }

    const bindings = await loadMappingBindings(ctx, company, [{ account_key: 'VENDOR_AP_ACCOUNT' }]);
    const payable = resolveAccountBinding(bindings, 'VENDOR_AP_ACCOUNT', {
      date: rec.entry_date,
      dimensions: { branch_id: rec.branch_id, currency: company.currency, supplier_id: supplier.id },
    });
    const debitChecked = await checkedAccounts(
      ctx,
      company,
      [{ account_id: payable.account_id, debit: amount, credit: 0, cost_center: rec.branch_id, channel: 'purchasing', product_reference: rec.invoice_id || '', counterparty_reference: supplier.id }],
      rec.entry_date
    );
    requireValue(debitChecked[0].account_code.startsWith('2'), 'VENDOR_AP_ACCOUNT must resolve to a liability account.');

    const { creditLine, custodyEntry, sourceLabel, method } = await resolveDisbursementCredit(ctx, company, rec);
    const lines = [debitChecked[0], { ...creditLine, channel: 'purchasing', counterparty_reference: supplier.id }];
    validateLines(lines, company.currency_decimals);

    const supplierEntry = await ctx.svc.entities.SupplierLedgerEntry.create({
      entry_key: entryKey,
      company_id: company.id,
      branch_id: rec.branch_id,
      supplier_id: supplier.id,
      invoice_id: rec.invoice_id || '',
      invoice_number: rec.invoice_number || '',
      kind: 'payment',
      status: 'pending',
      entry_date: rec.entry_date,
      delta: -amount,
      currency: company.currency,
      payment_method_id: method?.id || '',
      payment_method: method?.code || (rec.source_type === 'custody' ? 'custody' : ''),
      payment_method_name: method?.name || sourceLabel,
      account_snapshot: { lines, source_type: rec.source_type, custody_id: rec.custody_id || '' },
      notes: `${rec.description}${rec.reference ? ` (${rec.reference})` : ''}`,
      actor_email: ctx.user.email,
    });

    const journal = await ctx.svc.entities.FinanceJournal.create({
      company_id: company.id,
      branch_id: rec.branch_id,
      entry_date: rec.entry_date,
      description: `Vendor payment · ${supplier.name}${rec.invoice_number ? ` · ${rec.invoice_number}` : ''}`,
      kind: 'automatic',
      posting_key: `${company.id}:vendor-disbursement:${rec.id}`,
      proposal_id: `supplier:${supplierEntry.id}`,
      status: 'posted',
      source_entity: 'SupplierLedgerEntry',
      source_id: supplierEntry.id,
      source_version: supplierEntry.updated_date || '',
      source_summary: {
        disbursement_id: rec.id,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        invoice_id: rec.invoice_id || '',
        paid_from: sourceLabel,
      },
      currency: company.currency,
      business_edition: company.edition,
      lines,
      prepared_by: rec.requested_by,
      prepared_by_id: rec.requested_by_id || 'system',
      rule_version: 'expenses-vendor-v1',
      reviewed_by: ctx.user.email,
      reviewed_by_id: ctx.user.id,
      reviewed_at: new Date().toISOString(),
      review_note: `Approved vendor payment via ${sourceLabel}`,
      evidence_note: rec.reference || rec.description,
      total_debit: amount,
      total_credit: amount,
      is_test: !!company.is_test,
    });
    await projectFinanceJournal(ctx, company, journal);
    await ctx.svc.entities.SupplierLedgerEntry.update(supplierEntry.id, { status: 'posted', journal_id: journal.id });
    if (custodyEntry) {
      await ctx.svc.entities.FinanceCustodyEntry.update(custodyEntry.id, { journal_id: journal.id });
    }

    const approved = await ctx.svc.entities.FinanceExpenseDisbursement.update(rec.id, {
      status: 'approved',
      decided_by: ctx.user.email,
      decided_at: new Date().toISOString(),
      journal_id: journal.id,
      custody_entry_id: custodyEntry?.id || '',
      supplier_entry_id: supplierEntry.id,
    });

    await audit(ctx.base44, ctx.user, 'update', 'FinanceExpenseDisbursement', `Approved vendor payment to ${supplier.name} (${company.currency} ${amount.toFixed(2)}) via ${sourceLabel}`, {
      entityId: approved.id,
      changes: { status: 'approved', journal_id: journal.id, supplier_entry_id: supplierEntry.id, paid_from: sourceLabel, self_approved: isCreator },
    });
    return { disbursement: approved, journal };
  });
}