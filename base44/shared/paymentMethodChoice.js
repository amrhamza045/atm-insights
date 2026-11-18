// "Paid from" on payroll payouts and staff advances: an active payment method of the
// company that owns the branch. Its cash or bank account is set in Payment methods only.
import { requireValue } from './financeValidation.js';
import { paymentCompany } from './cateringConfiguredPayment.js';
import { methodFor } from './financePaymentMethodSource.js';

export async function activePaymentMethods(svc, branchId) {
  requireValue(typeof branchId === 'string' && branchId, 'Select a branch.');
  const company = await paymentCompany(svc, branchId);
  const page = await svc.entities.FinancePaymentMethod.filter({ company_id: company.id, is_active: true }, { sort: 'name', limit: 100 });
  return page.items;
}

// Saved on the record by code and name; empty when none was chosen.
export async function paidFromMethod(svc, branchId, code) {
  if (!code) return {};
  const m = methodFor(await activePaymentMethods(svc, branchId), String(code));
  requireValue(m, 'Choose an active payment method from Finance › Payment methods.');
  return { payment_method: m.code, payment_method_name: m.name };
}