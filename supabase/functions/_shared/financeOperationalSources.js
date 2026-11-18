// Operational sources that prepare journals for Finance review (never auto-post):
// payroll accrual and payment, employee advances, cash / petty-cash expenses and
// returned catering items valued at their original release cost.
import { requireValue } from './financeValidation.js';
import { itemStockBinding } from './inventoryStockBinding.js';
import { companyPaymentMethods, paymentMethodOf } from './financePaymentMethodSource.js';

export const OPERATIONAL_ENTITIES = ['SalaryRecord', 'PayrollDisbursement', 'EmployeeBorrowing', 'Expense', 'CateringReturnedItem'];
export const RETURN_DISPOSITIONS = ['returned_to_stock', 'staff_meal', 'wasted'];
// returned_to_stock goes back to the item's own inventory account (see restockLine).
const RETURN_DEBIT = { staff_meal: 'STAFF_MEAL_EXPENSE', wasted: 'WASTE_EXPENSE_ACCOUNT' };

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;
const day = (v) => String(v || '').slice(0, 10);
const monthEnd = (m) => { const [y, mo] = String(m).split('-').map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); };
const dr = (key, amount) => ({ account_key: key, debit: round(amount), credit: 0 });
const cr = (key, amount) => ({ account_key: key, debit: 0, credit: round(amount) });
const nonZero = (lines) => lines.filter((l) => l.debit > 0 || l.credit > 0);

// True when the record is final enough to prepare a journal from.
export async function operationalEligible(ctx, entity, s) {
  if (entity === 'SalaryRecord') return s.payment_status !== 'pending' || (await ctx.svc.entities.PayrollDisbursement.count({ salary_record_id: s.id })) > 0;
  if (entity === 'PayrollDisbursement') return s.status === 'paid' && !s.journal_id; // Skips modern post-approval payouts since they post their own journal atomically
  if (entity === 'EmployeeBorrowing') return !['pending', 'rejected'].includes(s.request_status) && s.status !== 'cancelled';
  if (entity === 'Expense') return s.status === 'approved';
  if (entity === 'CateringReturnedItem') return RETURN_DISPOSITIONS.includes(s.disposition);
  return false;
}

async function departmentName(ctx, employeeId) {
  if (!employeeId) return '';
  const emp = await ctx.svc.entities.Employee.get(employeeId).catch(() => null);
  if (!emp?.department) return '';
  const dept = await ctx.svc.entities.Department.get(emp.department).catch(() => null);
  return dept?.name || emp.department;
}

async function salaryPlan(ctx, company, s) {
  const date = monthEnd(s.month), net = round(s.net_salary), tax = round(s.tax_withheld_amount), adv = round(s.borrowing_deductions);
  const expense = round(net + tax + adv);
  requireValue(expense > 0, 'Salary record has no amount to post.');
  const emp = await ctx.svc.entities.Employee.get(s.employee_id).catch(() => null);
  const dept = await departmentName(ctx, s.employee_id);
  
  if (emp?.employment_type === 'temporary' || emp?.employment_type === 'freelance') {
    const monthPrefix = String(s.month || '').slice(0, 7);
    const att = await ctx.svc.entities.Attendance.filter({ employee_id: s.employee_id, review_status: 'approved' }, { limit: 200 });
    const monthAtt = att.items.filter((a) => !monthPrefix || String(a.date || '').startsWith(monthPrefix));
    const shiftIds = [...new Set(monthAtt.map((a) => a.shift_id).filter(Boolean))];
    const shifts = shiftIds.length ? (await ctx.svc.entities.Shift.filter({ id: { $in: shiftIds } }, { limit: 200 })).items : [];
    const eventIds = [...new Set(shifts.map((sh) => sh.catering_event_id).filter(Boolean))];
    const share = eventIds.length ? round(expense / eventIds.length) : expense;
    const eventLines = eventIds.length
      ? eventIds.map((eid, idx) => ({
          account_key: 'EVENT_WIP_ACCOUNT',
          debit: idx === eventIds.length - 1 ? round(expense - share * (eventIds.length - 1)) : share,
          credit: 0,
          cost_center: eid,
          dimensions: { event_id: eid },
        }))
      : [dr('EVENT_WIP_ACCOUNT', expense)];
    return {
      date, description: `External labor ${s.month} · ${s.employee_name}`, dimensions: { branch_id: s.branch_id, service_type_id: 'external_labor' },
      lines: nonZero([...eventLines, cr('EXTERNAL_LABOR_PAYABLE', net), cr('EMPLOYEE_ADVANCE_ACC', adv), cr('PAYROLL_TAX_PAYABLE', tax)]),
      summary: { employee: s.employee_name, month: s.month, payroll_type: 'External event labor (B14)', net_salary: net, tax_withheld: tax, advance_recovered: adv },
      fingerprint: [s.month, net, tax, adv, 'external', eventIds.join(',')].join('|'),
    };
  }
  
  // Kitchen payroll only where Mapping Accounts has a kitchen labour rule for this department.
  const kitchen = (await ctx.svc.entities.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: 'KITCHEN_DIRECT_LABOR_EXP' }, { limit: 200 })).items
    .some((b) => dept && b.conditions?.category === dept);
  return {
    date, description: `Payroll ${s.month} · ${s.employee_name}`, dimensions: { branch_id: s.branch_id, category: dept },
    lines: nonZero([dr(kitchen ? 'KITCHEN_DIRECT_LABOR_EXP' : 'ADMIN_SALARIES_EXPENSE', expense), cr('PAYROLL_ACCRUAL_ACC', net), cr('EMPLOYEE_ADVANCE_ACC', adv), cr('PAYROLL_TAX_PAYABLE', tax)]),
    summary: { employee: s.employee_name, month: s.month, department: dept || 'Not set', payroll_type: kitchen ? 'Kitchen (B13)' : 'Administrative (B15)', net_salary: net, tax_withheld: tax, advance_recovered: adv },
    fingerprint: [s.month, net, tax, adv, kitchen].join('|'),
  };
}

// Cash and bank come from Finance › Payment methods: the method the record was paid
// with, else the company default (and the journal says so for review).
async function paidFrom(ctx, company, code) {
  const m = paymentMethodOf(await companyPaymentMethods(ctx.svc.entities, company), code);
  return { dimensions: code ? { payment_method: code } : {}, label: code ? m.name : `${m.name} (company default: the payment method was not recorded)` };
}

async function expensePlan(ctx, company, s) {
  const amount = round(s.amount);
  requireValue(amount > 0, 'Expense has no amount.');
  const paid = await paidFrom(ctx, company, s.payment_method);
  return {
    date: day(s.expense_date || s.created_date), description: `Cash expense · ${s.category} · ${s.description || s.recipient || ''}`.trim(),
    dimensions: { branch_id: s.branch_id, category: s.category, ...paid.dimensions },
    lines: [dr('OPERATING_EXPENSE_ACC', amount), cr('PAYMENT_METHOD_ACC', amount)],
    summary: { category: s.category, payment_method: s.payment_method, paid_from: paid.label, recipient: s.recipient || '', cashier_session: s.session_id || '', submitted_by: s.submitted_by || '' },
    fingerprint: [amount, s.category, s.payment_method, day(s.expense_date)].join('|'),
  };
}

// What the event received of one stock item, at the cost it left stock at: stock released
// to the event, and the finished dish its production batches made from the dish recipe.
async function eventIssuesOf(db, s) {
  const [released, orders] = await Promise.all([
    db.InventoryMovement.filter({ movement_type: 'catering_release', event_id: s.event_id, inventory_item_id: s.inventory_item_id }, { limit: 200 }),
    db.ProductionOrder.filter({ catering_event_id: s.event_id, status: 'completed', output_item_id: s.inventory_item_id }, { limit: 50 }),
  ]);
  const issues = released.items.map((m) => ({ quantity: Number(m.quantity) || 0, cost: Number(m.cost_impact) || 0, unit: m.unit || '', id: m.source_id, made: false }));
  const ids = orders.items.map((o) => o.id);
  const costed = ids.length ? (await db.InventoryAccountingMovement.filter({ kind: 'production', status: 'applied', source_entity: 'ProductionOrder', source_id: { $in: ids } }, { limit: 100 })).items : [];
  for (const o of orders.items) {
    // The posted production cost when there is one (what finished goods carry), else the batch cost.
    const out = costed.find((m) => m.source_id === o.id)?.snapshot?.output;
    issues.push(out
      ? { quantity: Number(out.quantity) || 0, cost: Number(out.cost) || 0, unit: out.unit || o.output_unit || '', id: o.id, made: true }
      : { quantity: Number(o.actual_output_quantity) || 0, cost: Number(o.total_cost) || 0, unit: o.output_unit || '', id: o.id, made: true });
  }
  return issues.filter((i) => i.quantity > 0);
}

// Returned items: quantity × the unit cost the item reached this event at.
export async function returnValuation(ctx, s) {
  requireValue(s.inventory_item_id, `"${s.item_name}" is not linked to a stock item, so what the event received cannot be found. Edit the return and pick the item from what the event received.`);
  const issues = await eventIssuesOf(ctx.svc.entities, s);
  requireValue(issues.length, `"${s.item_name}" was not released to or made for this event. Returns are valued at the cost the event received them at.`);
  const unit = issues[0].unit, same = (u) => !u || !unit || u.toLowerCase() === unit.toLowerCase();
  requireValue(issues.every((i) => same(i.unit)), `"${s.item_name}" reached this event in more than one unit. Review its releases before valuing the return.`);
  requireValue(same(s.unit), `"${s.item_name}" reached the event in ${unit} but was returned in ${s.unit}. Record the return in ${unit}.`);
  const issuedQty = issues.reduce((t, i) => t + i.quantity, 0), issuedCost = issues.reduce((t, i) => t + i.cost, 0);
  const others = (await ctx.svc.entities.CateringReturnedItem.filter({ event_id: s.event_id, inventory_item_id: s.inventory_item_id, disposition: { $in: RETURN_DISPOSITIONS } }, { limit: 200 })).items
    .filter((r) => r.id !== s.id && r.created_date < s.created_date).reduce((t, r) => t + (Number(r.quantity) || 0), 0);
  requireValue(others + Number(s.quantity) <= issuedQty + 1e-9, `Returned quantity of "${s.item_name}" (${others + Number(s.quantity)} ${unit}) is more than the event received (${issuedQty} ${unit}).`);
  const unitCost = issuedCost / issuedQty;
  return { unitCost: Math.round(unitCost * 10000) / 10000, value: round(unitCost * Number(s.quantity)), issuedQty, unit, releaseIds: issues.map((i) => i.id), made: issues.some((i) => i.made) };
}

// Back on the shelf: the item's own inventory account (finished goods for a dish, raw
// materials for an ingredient), where the rest of its stock value is carried.
async function restockLine(ctx, company, s, amount, date) {
  const item = await ctx.svc.entities.InventoryItem.get(s.inventory_item_id).catch(() => null);
  requireValue(item?.category_id, `"${s.item_name}" needs an inventory category before it can go back to stock.`);
  const b = await itemStockBinding(ctx.svc.entities, company, item, date);
  return { account_id: b.account_id, binding_id: b.id, binding_updated_date: b.updated_date, debit: round(amount), credit: 0 };
}

async function returnPlan(ctx, company, s) {
  const v = await returnValuation(ctx, s);
  requireValue(v.value > 0, 'Returned item has no cost to post.');
  const date = day(s.created_date);
  const closed = (await ctx.svc.entities.InventoryAccountingMovement.count({ company_id: company.id, source_entity: 'CateringEvent', source_id: s.event_id, status: 'applied' })) > 0;
  const creditKey = closed ? 'EVENT_COGS_ACCOUNT' : 'EVENT_WIP_ACCOUNT';
  const debit = s.disposition === 'returned_to_stock' ? await restockLine(ctx, company, s, v.value, date) : dr(RETURN_DEBIT[s.disposition], v.value);
  return {
    date, description: `Catering return · ${s.item_name} · ${s.event_name || ''}`.trim(),
    dimensions: { branch_id: s.branch_id, event_id: s.event_id, category: s.category, return_reason_code: s.disposition, original_tx_id: v.releaseIds[0] },
    lines: [debit, cr(creditKey, v.value)],
    summary: { item: s.item_name, event: s.event_name, disposition: s.disposition, quantity: s.quantity, unit: v.unit, original_unit_cost: v.unitCost, received_as: v.made ? 'Made for the event (production)' : 'Released from stock', released_quantity: v.issuedQty, credited: closed ? 'Event COGS (event already closed)' : 'Event work in progress', restores_stock: s.disposition === 'returned_to_stock' },
    fingerprint: [s.disposition, s.quantity, v.unitCost, closed].join('|'),
    record: { original_unit_cost: v.unitCost, return_value: v.value },
  };
}

export async function operationalPlan(ctx, company, entity, s) {
  if (entity === 'SalaryRecord') return await salaryPlan(ctx, company, s);
  if (entity === 'Expense') return await expensePlan(ctx, company, s);
  if (entity === 'CateringReturnedItem') return await returnPlan(ctx, company, s);
  const amount = round(s.amount);
  requireValue(amount > 0, 'Record has no amount to post.');
  const paid = await paidFrom(ctx, company, s.payment_method), method = s.payment_method ? [s.payment_method] : [];
  if (entity === 'PayrollDisbursement') return {
    date: day(s.confirmed_at || s.updated_date), description: `Payroll payment ${s.month} · ${s.employee_name}`, dimensions: { branch_id: s.branch_id, ...paid.dimensions },
    lines: [dr('PAYROLL_ACCRUAL_ACC', amount), cr('BANK_CASH_ACCOUNT', amount)],
    summary: { employee: s.employee_name, month: s.month, confirmed_by: s.confirmed_by || '', paid_from: paid.label }, fingerprint: [amount, s.month, ...method].join('|'),
  };
  return {
    date: day(s.borrow_date || s.created_date), description: `Employee advance approval · ${s.employee_name}`, dimensions: { branch_id: s.branch_id },
    lines: [dr('EMPLOYEE_ADVANCE_ACC', amount), cr('PAYROLL_ACCRUAL_ACC', amount)],
    summary: { employee: s.employee_name, reason: s.reason || '', repayment: s.repayment_type || '', approved_by: s.decision_by || '', payout_status: 'Awaiting Stage 2 Payout' }, fingerprint: [amount, day(s.borrow_date), s.repayment_type].join('|'),
  };
}