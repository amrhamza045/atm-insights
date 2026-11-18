// Finance › Mapping Accounts › Payment methods is the only source of cash and bank
// accounts. Both payment account keys resolve from this list, never from mapping rules:
// the method a record was paid with (its code or an older code), else the company default.
import { requireValue } from './financeValidation.js';

export const PAYMENT_ACCOUNT_KEYS = ['PAYMENT_METHOD_ACC', 'BANK_CASH_ACCOUNT'];
export const PAYMENT_KEY_MESSAGE = 'Cash and bank accounts come from Finance › Mapping Accounts › Payment methods. Add or edit the payment method there.';
export const methodCodes = (m) => [m.code, ...(m.legacy_codes || [])];
export const methodFor = (methods, code) => (code ? (methods || []).find((m) => methodCodes(m).includes(code)) : undefined);

export async function companyPaymentMethods(db, company) {
  const page = await db.FinancePaymentMethod.filter({ company_id: company.id }, { limit: 200 });
  requireValue(!page.has_more, 'Too many payment methods to resolve safely.');
  return page.items;
}

// The method a record was paid with, or the company default when it does not say.
export function paymentMethodOf(methods, code) {
  const m = code ? methodFor(methods, code) : (methods || []).find((x) => x.is_default && x.is_active);
  requireValue(m, code
    ? `Payment method "${code}" is not in Finance › Mapping Accounts › Payment methods. Add it there, or add "${code}" as an older code of an existing method.`
    : 'This record does not say how it was paid. Mark one payment method as the default in Finance › Mapping Accounts › Payment methods.');
  return m;
}

// Stand-ins for mapping rules, so every resolver reads payment accounts from the list.
export function withPaymentMethods(bindings, methods) {
  const listed = PAYMENT_ACCOUNT_KEYS.flatMap((mapping_key) => methods.map((m) => ({ id: m.id, mapping_key, account_id: m.account_id, updated_date: m.updated_date, payment_method: m })));
  return [...bindings.filter((b) => !PAYMENT_ACCOUNT_KEYS.includes(b.mapping_key)), ...listed];
}

export function resolvePaymentMethodBinding(bindings, key, sample) {
  const listed = bindings.filter((b) => b.mapping_key === key && b.payment_method);
  const m = paymentMethodOf(listed.map((b) => b.payment_method), sample.dimensions?.payment_method);
  return listed.find((b) => b.payment_method.id === m.id);
}