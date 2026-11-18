import { requireValue, validateLines } from './financeValidation.js';
import { financePermission } from './financeAccess.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { resolveMappingLines } from './financeBindingResolver.js';
import { projectFinanceJournal } from './financeLedger.js';
import { companyPaymentMethods, paymentMethodOf } from './financePaymentMethodSource.js';
import { assertSufficientCustody, deductCustodyForHrPayout } from './financeCustody.js';
import { prepareOperational } from './financeOperationalReview.js';

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;
const day = (v) => String(v || '').slice(0, 10);

// HR clicks "Send to Finance" in Payroll: creates PayrollDisbursement rows and prepares Stage 1 accrual proposals.
export async function handoffPayrollToFinance(ctx, company, branchId, month) {
  const scope = branchId ? { branch_id: branchId } : { branch_id: { $in: company.branch_ids || [] } };
  const [records, sent, emps] = await Promise.all([
    ctx.svc.entities.SalaryRecord.filter({ month: `${month}-01`, ...scope }, { limit: 500 }),
    ctx.svc.entities.PayrollDisbursement.filter({ month: `${month}-01`, ...scope }, { limit: 500 }),
    ctx.svc.entities.Employee.filter(scope, { limit: 500 }),
  ]);
  const empTypeById = Object.fromEntries(emps.items.map((e) => [e.id, e.employment_type || 'regular']));
  const unsent = records.items.filter((r) => !sent.items.some((d) => d.employee_id === r.employee_id));
  if (unsent.length > 0) {
    await ctx.svc.entities.PayrollDisbursement.bulkCreate(
      unsent.map((r) => ({
        month: `${month}-01`,
        employee_id: r.employee_id,
        employee_name: r.employee_name,
        employment_type: empTypeById[r.employee_id] || 'regular',
        branch_id: r.branch_id,
        branch_name: r.branch_name || '',
        salary_record_id: r.id,
        amount: round(r.net_salary),
        status: 'pending',
        submitted_by: ctx.user.email,
        submitted_at: new Date().toISOString(),
      }))
    );
    for (const r of unsent) {
      await prepareOperational(ctx, company, 'SalaryRecord', r);
    }
  }
  return { success: true, count: unsent.length };
}

export async function listHrPayouts(ctx, company, branchId) {
  financePermission(ctx, 'finance_view');
  const branchScope = branchId && (company.branch_ids || []).includes(branchId)
    ? { branch_id: branchId }
    : { branch_id: { $in: company.branch_ids || [] } };

  const [payrolls, advances, methods, custodies] = await Promise.all([
    ctx.svc.entities.PayrollDisbursement.filter(branchScope, { sort: '-month', limit: 200 }),
    ctx.svc.entities.EmployeeBorrowing.filter(
      { status: { $ne: 'cancelled' }, request_status: { $nin: ['pending', 'rejected'] }, ...branchScope },
      { sort: '-borrow_date', limit: 200 }
    ),
    companyPaymentMethods(ctx.svc.entities, company),
    ctx.svc.entities.FinanceCustody.filter({ company_id: company.id, status: 'active' }, { limit: 200 }),
  ]);

  const enrichStage1 = async (entity, items) => {
    const opEntity = entity === 'PayrollDisbursement' ? 'SalaryRecord' : entity;
    const keys = items
      .map((s) => {
        const sid = entity === 'PayrollDisbursement' ? s.salary_record_id : s.id;
        return sid ? `${company.id}:op:${opEntity}:${sid}` : null;
      })
      .filter(Boolean);
    const proposals = keys.length
      ? (await ctx.svc.entities.FinanceProposal.filter({ company_id: company.id, source_key: { $in: keys } }, { limit: 500 })).items
      : [];
    return items.map((s) => {
      const sid = entity === 'PayrollDisbursement' ? s.salary_record_id : s.id;
      const k = sid ? `${company.id}:op:${opEntity}:${sid}` : '';
      const list = proposals.filter((x) => x.source_key === k);
      const posted = list.find((x) => x.status === 'posted');
      const pending = list.find((x) => x.status === 'pending');
      const status = posted ? 'approved' : pending ? 'pending_approval' : 'missing_proposal';
      return {
        ...s,
        _entity: entity,
        approval_status: status,
        approval_journal_id: posted?.decision_id || '',
      };
    });
  };

  const [pRows, aRows] = await Promise.all([
    enrichStage1('PayrollDisbursement', payrolls.items),
    enrichStage1('EmployeeBorrowing', advances.items),
  ]);

  return {
    items: [...pRows, ...aRows],
    payment_methods: methods.filter((m) => m.is_active),
    custodies: custodies.items,
  };
}

function findPostedPayableLine(proposal, amount) {
  const creditLines = (proposal.lines || []).filter((l) => Number(l.credit) > 0);
  return (
    creditLines.find((l) => ['PAYROLL_ACCRUAL_ACC', 'EXTERNAL_LABOR_PAYABLE'].includes(l.account_key)) ||
    creditLines.find((l) => Math.abs(Number(l.credit) - amount) < 0.02) ||
    creditLines[0]
  );
}

// Finance confirms Stage 2 Payout (single or batch) after Finance journal approval.
export async function confirmHrPayout(ctx, company, input) {
  financePermission(ctx, 'finance_edit');
  requireValue(Array.isArray(input.items) && input.items.length > 0, 'Select at least one payout.');
  requireValue(
    input.payout_source_type === 'payment_method' || input.payout_source_type === 'custody',
    'Select a payment method or staff custody.'
  );
  requireValue(input.source_id, 'Select a payment method or staff custody.');

  const date = day(input.date || new Date().toISOString());
  openFinanceDate(company, date);

  // Pre-load & validate every target record + its approved Stage 1 journal BEFORE mutating anything.
  const prepared = [];
  let totalBatchAmount = 0;
  for (const item of input.items) {
    requireValue(['PayrollDisbursement', 'EmployeeBorrowing'].includes(item._entity), 'Unsupported payout entity.');
    const isAdvance = item._entity === 'EmployeeBorrowing';
    const rec = await ctx.svc.entities[item._entity].get(item.id);
    requireValue(rec && (company.branch_ids || []).includes(rec.branch_id), `Payout record not found in ${company.name}.`);
    const amount = round(rec.amount);
    requireValue(amount > 0, `${rec.employee_name} has no payout amount.`);
    if (isAdvance) requireValue(rec.payout_status !== 'paid', `${rec.employee_name}'s advance is already paid.`);
    else requireValue(rec.status === 'pending', `${rec.employee_name}'s payroll is already paid.`);

    const opEntity = isAdvance ? 'EmployeeBorrowing' : 'SalaryRecord';
    const opId = isAdvance ? rec.id : rec.salary_record_id;
    requireValue(opId, `Missing linked ${opEntity} on ${rec.employee_name}.`);
    const sourceKey = `${company.id}:op:${opEntity}:${opId}`;
    const proposals = await ctx.svc.entities.FinanceProposal.filter(
      { company_id: company.id, source_key: sourceKey, status: 'posted' },
      { limit: 5 }
    );
    requireValue(
      proposals.items.length >= 1,
      `Finance must approve the journal in Pending review before paying ${rec.employee_name}.`
    );
    const stage1 = proposals.items[0];
    const payableLine = findPostedPayableLine(stage1, amount);
    requireValue(payableLine?.account_id, `Could not resolve the approved payable account for ${rec.employee_name}.`);

    totalBatchAmount = round(totalBatchAmount + amount);
    prepared.push({ item, isAdvance, rec, amount, payableLine });
  }

  let method = null;
  if (input.payout_source_type === 'payment_method') {
    method = paymentMethodOf(await companyPaymentMethods(ctx.svc.entities, company), input.source_id);
    requireValue(method.is_active, 'Selected payment method is inactive.');
  } else {
    // Strictly block upfront if custody balance cannot cover the ENTIRE payout request!
    await assertSufficientCustody(ctx, company, input.source_id, totalBatchAmount, date);
  }

  const results = [];
  for (const { item, isAdvance, rec, amount, payableLine } of prepared) {
    let creditLine, custodyHolderName = '';
    let custodyEntry = null;

    if (input.payout_source_type === 'payment_method') {
      const resolved = await resolveMappingLines(
        ctx,
        company,
        [{ account_key: 'PAYMENT_METHOD_ACC', debit: 0, credit: amount }],
        { date, dimensions: { branch_id: rec.branch_id, payment_method: method.code } }
      );
      const checked = await checkedAccounts(ctx, company, resolved.map((l) => ({ cost_center: rec.branch_id, ...l })), date);
      creditLine = checked[0];
    } else {
      const deducted = await deductCustodyForHrPayout(ctx, company, input.source_id, amount, date, {
        source_entity: item._entity,
        source_id: rec.id,
        cost_center: rec.branch_id,
        notes: `${isAdvance ? 'Advance' : 'Payroll'} payout · ${rec.employee_name}`,
      });
      creditLine = deducted.account;
      custodyHolderName = deducted.custody.employee_name;
      custodyEntry = deducted.entry;
    }

    const debitLine = (
      await checkedAccounts(
        ctx,
        company,
        [{ account_id: payableLine.account_id, account_key: payableLine.account_key, debit: amount, credit: 0, cost_center: rec.branch_id }],
        date
      )
    )[0];

    const lines = [debitLine, creditLine];
    const totals = validateLines(lines, company.currency_decimals);
    const label = isAdvance
      ? `Advance payout · ${rec.employee_name}`
      : rec.employment_type === 'temporary' || rec.employment_type === 'freelance'
      ? `External labor payout ${rec.month || ''} · ${rec.employee_name}`.trim()
      : `Payroll payout ${rec.month || ''} · ${rec.employee_name}`.trim();

    const journal = await ctx.svc.entities.FinanceJournal.create({
      company_id: company.id,
      branch_id: rec.branch_id,
      entry_date: date,
      description: label,
      kind: 'manual',
      posting_key: `${company.id}:hr-payout:${item._entity}:${rec.id}`,
      status: 'posted',
      source_entity: item._entity,
      source_id: rec.id,
      source_version: rec.updated_date || '',
      source_summary: {
        employee: rec.employee_name,
        payout_source: input.payout_source_type,
        ...(method ? { payment_method: method.code, payment_method_name: method.name } : { custody_id: input.source_id, custody_holder: custodyHolderName }),
      },
      currency: company.currency,
      business_edition: company.edition,
      lines,
      ...totals,
      prepared_by: 'Automatic (HR payouts)',
      prepared_by_id: 'system',
      rule_version: 'hr-payout-v1',
      reviewed_by: ctx.user.email,
      reviewed_by_id: ctx.user.id,
      reviewed_at: new Date().toISOString(),
      review_note: method ? `Paid via ${method.name}` : `Paid from ${custodyHolderName} custody`,
      evidence_note: 'Post-approval HR payout settlement',
      is_test: !!company.is_test,
    });
    await projectFinanceJournal(ctx, company, journal);

    if (custodyEntry) {
      await ctx.svc.entities.FinanceCustodyEntry.update(custodyEntry.id, { journal_id: journal.id });
    }
    if (method && !method.has_transactions) {
      await ctx.svc.entities.FinancePaymentMethod.update(method.id, { has_transactions: true });
    }

    const stamp = {
      payout_source_type: input.payout_source_type,
      ...(method
        ? { payment_method: method.code, payment_method_name: method.name, custody_id: '', custody_holder_name: '' }
        : { custody_id: input.source_id, custody_holder_name: custodyHolderName, payment_method: '', payment_method_name: '' }),
    };

    if (isAdvance) {
      await ctx.svc.entities.EmployeeBorrowing.update(rec.id, {
        payout_status: 'paid',
        paid_by: ctx.user.email,
        paid_at: new Date().toISOString(),
        payout_journal_id: journal.id,
        ...stamp,
      });
    } else {
      await ctx.svc.entities.PayrollDisbursement.update(rec.id, {
        status: 'paid',
        confirmed_by: ctx.user.email,
        confirmed_at: new Date().toISOString(),
        journal_id: journal.id,
        ...stamp,
      });
      if (rec.salary_record_id) {
        await ctx.svc.entities.SalaryRecord.update(rec.salary_record_id, {
          payment_status: 'paid',
          payment_date: date,
        });
      }
    }
    results.push({ id: rec.id, journal_id: journal.id });
  }
  return { success: true, posted: results.length, results };
}