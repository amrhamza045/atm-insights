import { checkPermission } from './requirePermission.js';
import { paymentCompany } from './cateringConfiguredPayment.js';
import { requireValue } from './financeValidation.js';
export async function supplierContext(base44, user, input, write = false) {
  const flags = input.action === 'opening' ? ['finance_journal_approve'] : write ? ['purchase_approve', 'finance_edit'] : ['purchase_view', 'purchase_edit', 'purchase_approve', 'financial_view', 'finance_edit', 'supplier_payment_record'];
  const check = await checkPermission(base44, user, flags);
  requireValue(check.allowed, check.reason || 'Supplier account access denied.', check.status || 403);
  requireValue(typeof input.branch_id === 'string' && input.branch_id && typeof input.supplier_id === 'string' && input.supplier_id, 'Select a branch and supplier.');
  requireValue(user.role === 'admin' || !check.permissions.branch_id || check.permissions.branch_id === input.branch_id, 'This branch is outside your access.', 403);
  const svc = base44.asServiceRole, company = await paymentCompany(svc, input.branch_id);
  requireValue(company.currency === 'EGP' && company.currency_decimals === 2, 'Supplier accounts currently require an EGP company with two decimal places.');
  const supplier = await svc.entities.Supplier.get(input.supplier_id);
  requireValue(!write || supplier.is_active !== false, 'This supplier is inactive.');
  return { base44, svc, company, supplier, user, branch: input.branch_id, query: {company_id: company.id, branch_id: input.branch_id, supplier_id: supplier.id} };
}
export async function withSupplierLock(ctx, work) {
  const entity = ctx.svc.entities.Supplier, id = ctx.supplier.id, token = crypto.randomUUID();
  await entity.updateMany({id, $or: [{account_write_token: ''}, {account_write_token: null}, {account_write_token: {$exists: false}}]}, {$set: {account_write_token: token, account_write_started_at: new Date().toISOString()}});
  requireValue((await entity.get(id)).account_write_token === token, 'Another supplier change is in progress. Retry shortly; interrupted changes need administrator review.', 409);
  try { return await work(); }
  finally { await entity.updateMany({id, account_write_token: token}, {$set: {account_write_token: '', account_write_started_at: ''}}); }
}
export const supplierEntries = ctx => ctx.svc.entities.SupplierLedgerEntry;
export async function supplierEntry(ctx, entry_key) { return (await supplierEntries(ctx).filter({...ctx.query, entry_key}, {limit: 1})).items[0] || null; }
export async function supplierBalance(ctx, extra = {}) {
  const result = await supplierEntries(ctx).aggregate({query: {...ctx.query, status: 'posted', ...extra}, sum: ['delta']});
  return Math.round(Number(result.rows[0]?.sum_delta || 0) * 100) / 100;
}
export async function supplierPendingGuard(ctx, allowed = []) {
  requireValue(!await supplierEntries(ctx).count({...ctx.query, status: 'pending', entry_key: {$nin: allowed}}), 'A previous supplier operation is incomplete. Resume that same operation before recording another.', 409);
}