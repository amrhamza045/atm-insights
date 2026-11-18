import test from 'node:test';
import assert from 'node:assert/strict';
import { openOrFundCustody } from './financeCustody.js';
import { confirmHrPayout } from './financeHrPayouts.js';

function buildFixture() {
  const company = {
    id: 'co1',
    name: 'Rosemary',
    branch_ids: ['b1'],
    currency: 'EGP',
    currency_decimals: 2,
    edition: 'catering',
    is_test: true,
  };
  const accounts = {
    acc_bank: { id: 'acc_bank', company_id: 'co1', code: '110100', name: 'Bank CIB', active: true, posting: true, classification: 'assets', management_mapping: 'cash' },
    acc_custody: { id: 'acc_custody', company_id: 'co1', code: '110200', name: 'Petty Cash Custody', active: true, posting: true, classification: 'assets', management_mapping: 'cash' },
    acc_payroll: { id: 'acc_payroll', company_id: 'co1', code: '210300', name: 'Payroll Accrual', active: true, posting: true, classification: 'liabilities', management_mapping: 'liabilities' },
    acc_ext_labor: { id: 'acc_ext_labor', company_id: 'co1', code: '210400', name: 'External Labor Payable', active: true, posting: true, classification: 'liabilities', management_mapping: 'liabilities' },
  };
  const custodies = new Map();
  const disbursements = new Map([
    ['d_unapproved', { id: 'd_unapproved', branch_id: 'b1', employee_id: 'e1', employee_name: 'Nour', salary_record_id: 'sr_unapproved', amount: 3000, status: 'pending', month: '2026-11-01' }],
    ['d_ready', { id: 'd_ready', branch_id: 'b1', employee_id: 'e2', employee_name: 'Karim', salary_record_id: 'sr_ready', amount: 4000, status: 'pending', month: '2026-11-01' }],
    ['d_ext', { id: 'd_ext', branch_id: 'b1', employee_id: 'e3', employee_name: 'Ziad', employment_type: 'freelance', salary_record_id: 'sr_ext', amount: 2500, status: 'pending', month: '2026-11-01' }],
  ]);
  const borrowings = new Map([
    ['adv_ready', { id: 'adv_ready', branch_id: 'b1', employee_id: 'e2', employee_name: 'Karim', amount: 1500, payout_status: 'unpaid', status: 'active', request_status: 'approved' }],
  ]);
  const proposals = [
    {
      id: 'p_ready',
      company_id: 'co1',
      source_key: 'co1:op:SalaryRecord:sr_ready',
      status: 'posted',
      lines: [{ account_id: 'acc_payroll', account_key: 'PAYROLL_ACCRUAL_ACC', debit: 0, credit: 4000 }],
    },
    {
      id: 'p_ext',
      company_id: 'co1',
      source_key: 'co1:op:SalaryRecord:sr_ext',
      status: 'posted',
      lines: [{ account_id: 'acc_ext_labor', account_key: 'EXTERNAL_LABOR_PAYABLE', debit: 0, credit: 2500 }],
    },
    {
      id: 'p_adv',
      company_id: 'co1',
      source_key: 'co1:op:EmployeeBorrowing:adv_ready',
      status: 'posted',
      lines: [{ account_id: 'acc_payroll', account_key: 'PAYROLL_ACCRUAL_ACC', debit: 0, credit: 1500 }],
    },
  ];
  const journals = [];

  const entities = {
    Employee: { get: async (id) => ({ id, name: 'Custodian One', branch_id: 'b1', email: 'c1@rosemary.com' }) },
    FinanceAccount: {
      filter: async ({ id }) => ({ items: (id?.$in || []).map((k) => accounts[k]).filter(Boolean) }),
      get: async (id) => accounts[id],
    },
    FinanceAccountBinding: {
      filter: async () => ({
        items: [{ id: 'bind_custody', company_id: 'co1', mapping_key: 'CUSTODY_CONTROL_ACC', account_id: 'acc_custody', priority: 10, effective_from: '2020-01-01', conditions: {}, updated_date: 'v1' }],
        has_more: false,
      }),
    },
    FinancePaymentMethod: {
      filter: async () => ({
        items: [{ id: 'pm1', company_id: 'co1', code: 'cib', name: 'Bank CIB', account_id: 'acc_bank', is_active: true, is_default: true, has_transactions: false, updated_date: 'v1' }],
        has_more: false,
      }),
      update: async () => ({}),
    },
    FinanceCustody: {
      count: async ({ employee_id, status }) => [...custodies.values()].filter((c) => c.employee_id === employee_id && c.status === status).length,
      create: async (data) => { const rec = { id: `c_${custodies.size + 1}`, ...data }; custodies.set(rec.id, rec); return rec; },
      get: async (id) => custodies.get(id),
      update: async (id, patch) => { const next = { ...custodies.get(id), ...patch }; custodies.set(id, next); return next; },
    },
    FinanceCustodyEntry: {
      create: async (data) => ({ id: `ce_${Math.random()}`, ...data }),
      update: async () => ({}),
    },
    FinanceProposal: {
      filter: async ({ source_key, status }) => ({
        items: proposals.filter((p) => p.source_key === source_key && (!status || p.status === status)),
      }),
    },
    FinanceJournal: {
      create: async (data) => { const j = { id: `j_${journals.length + 1}`, ...data }; journals.push(j); return j; },
      update: async () => ({}),
    },
    FinanceLedgerLine: {
      filter: async () => ({ items: [] }),
      bulkCreate: async () => ([]),
      upsert: async () => ({}),
    },
    PayrollDisbursement: {
      get: async (id) => disbursements.get(id),
      update: async (id, patch) => { const next = { ...disbursements.get(id), ...patch }; disbursements.set(id, next); return next; },
    },
    SalaryRecord: { update: async () => ({}) },
    EmployeeBorrowing: {
      get: async (id) => borrowings.get(id),
      update: async (id, patch) => { const next = { ...borrowings.get(id), ...patch }; borrowings.set(id, next); return next; },
    },
  };

  const ctx = { admin: true, permissions: {}, user: { id: 'u1', email: 'fin@rosemary.com' }, svc: { entities } };
  return { ctx, company, custodies, disbursements, borrowings, journals };
}

test('enforces single active custody per employee and blocks insufficient custody payouts', async () => {
  const { ctx, company, journals, borrowings, disbursements } = buildFixture();

  // Open custody with EGP 5,000 from Bank CIB
  const { custody } = await openOrFundCustody(ctx, company, { employee_id: 'emp_cust', amount: 5000, date: '2026-11-16', payment_method: 'cib' });
  assert.equal(custody.balance, 5000);

  // Second active custody for same employee is blocked
  await assert.rejects(
    () => openOrFundCustody(ctx, company, { employee_id: 'emp_cust', amount: 1000, date: '2026-11-16', payment_method: 'cib' }),
    /already has an active custody/
  );

  // Payout before Finance journal approval is blocked
  await assert.rejects(
    () => confirmHrPayout(ctx, company, { items: [{ _entity: 'PayrollDisbursement', id: 'd_unapproved' }], payout_source_type: 'payment_method', source_id: 'cib', date: '2026-11-16' }),
    /approve the journal in Pending review/
  );

  // Batch payout (4000 + 2500 = 6500) exceeding custody balance (5000) is blocked with zero partial deductions
  await assert.rejects(
    () => confirmHrPayout(ctx, company, {
      items: [{ _entity: 'PayrollDisbursement', id: 'd_ready' }, { _entity: 'PayrollDisbursement', id: 'd_ext' }],
      payout_source_type: 'custody',
      source_id: custody.id,
      date: '2026-11-16',
    }),
    /Insufficient custody balance/
  );
  assert.equal((await ctx.svc.entities.FinanceCustody.get(custody.id)).balance, 5000);

  // Pay external event labor (2500) + advance (1500) = 4000 from Custody -> succeeds, leaves 1000
  await confirmHrPayout(ctx, company, {
    items: [{ _entity: 'PayrollDisbursement', id: 'd_ext' }, { _entity: 'EmployeeBorrowing', id: 'adv_ready' }],
    payout_source_type: 'custody',
    source_id: custody.id,
    date: '2026-11-16',
  });
  assert.equal((await ctx.svc.entities.FinanceCustody.get(custody.id)).balance, 1000);
  assert.equal(borrowings.get('adv_ready').payout_status, 'paid');
  assert.equal(disbursements.get('d_ext').status, 'paid');
  // External labor payout debits EXTERNAL_LABOR_PAYABLE (acc_ext_labor) and credits CUSTODY_CONTROL_ACC (acc_custody)
  const extJournal = journals.find((j) => j.source_id === 'd_ext');
  assert.equal(extJournal.lines[0].account_id, 'acc_ext_labor');
  assert.equal(extJournal.lines[1].account_id, 'acc_custody');

  // Pay regular salary (4000) via Payment Method (Bank CIB) -> debits PAYROLL_ACCRUAL_ACC and credits Bank CIB
  await confirmHrPayout(ctx, company, {
    items: [{ _entity: 'PayrollDisbursement', id: 'd_ready' }],
    payout_source_type: 'payment_method',
    source_id: 'cib',
    date: '2026-11-16',
  });
  const salJournal = journals.find((j) => j.source_id === 'd_ready');
  assert.equal(salJournal.lines[0].account_id, 'acc_payroll');
  assert.equal(salJournal.lines[1].account_id, 'acc_bank');
});