import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { checkPermission } from '../../shared/requirePermission.js';
import { paymentCompany } from '../../shared/cateringConfiguredPayment.js';
import { withSupplierLock } from '../../shared/supplierAccountsAccess.js';
import { paySupplier } from '../../shared/supplierAccountMutations.js';
import { supplierTotals, payableInvoices, allocate, allocationKey, supplierPaymentHistory } from '../../shared/supplierPaymentTracker.js';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const READ_FLAGS = ['purchase_view', 'purchase_edit', 'purchase_approve', 'purchases_view', 'financial_view', 'finance_edit', 'supplier_payment_record'];
const fail = (error, status = 400) => Response.json({ error }, { status });

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return fail('Unauthorized', 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'pay';
    const check = await checkPermission(base44, user, action === 'pay' ? 'supplier_payment_record' : READ_FLAGS);
    if (!check.allowed) return fail(check.reason || 'Forbidden', check.status || 403);

    const branchId = String(body.branch_id || '').trim();
    if (!branchId) return fail('Select a branch.');
    const locked = check.permissions?.branch_id;
    if (user.role !== 'admin' && locked && locked !== branchId) return fail('This branch is outside your access.', 403);

    const svc = base44.asServiceRole;
    if (action === 'totals') return Response.json({ totals: await supplierTotals(svc, branchId) });

    const supplierId = String(body.supplier_id || '').trim();
    if (!supplierId) return fail('Select a supplier.');
    if (action === 'history') return Response.json({ payments: await supplierPaymentHistory(svc, branchId, supplierId) });

    const [supplier, branch, company] = await Promise.all([
      svc.entities.Supplier.get(supplierId),
      svc.entities.Branch.get(branchId),
      paymentCompany(svc, branchId),
    ]);
    const ctx = { base44, svc, company, supplier, user, branch: branchId, query: { company_id: company.id, branch_id: branchId, supplier_id: supplierId } };

    if (action === 'payable') {
      const invoices = await payableInvoices(ctx);
      return Response.json({ payable: r2(invoices.reduce((s, i) => s + i.outstanding, 0)), invoices });
    }
    if (action !== 'pay') return fail('Unknown action.');

    const key = String(body.idempotency_key || '').trim();
    const settlement = body.settlement === 'full' ? 'full' : 'partial';
    const method = String(body.payment_method || '').trim();
    const notes = String(body.notes || '').trim();
    const paymentDate = String(body.payment_date || '').trim();
    if (!key) return fail('A payment submission identifier is required.');
    if (!method) return fail('Choose a payment method.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) return fail('Choose a valid payment date.');
    if (supplier.is_active === false) return fail('This supplier is inactive.');

    let record = (await svc.entities.SupplierPayment.filter({ payment_key: key }, { limit: 1 })).items[0];
    if (record?.status === 'posted' || (record && !record.status)) return Response.json({ payment: record, duplicate: true });

    const result = await withSupplierLock(ctx, async () => {
      if (!record) {
        const invoices = await payableInvoices(ctx);
        const payable = r2(invoices.reduce((s, i) => s + i.outstanding, 0));
        const amount = settlement === 'full' ? payable : r2(body.amount);
        if (payable <= 0) throw Object.assign(new Error('No posted invoice balance is open for this supplier in this branch.'), { status: 400 });
        if (!(amount > 0)) throw Object.assign(new Error('Enter a payment amount greater than zero.'), { status: 400 });
        if (amount > payable + 0.001) throw Object.assign(new Error(`Payment cannot exceed the open invoice balance of ${payable.toFixed(2)} EGP.`), { status: 400 });
        record = await svc.entities.SupplierPayment.create({
          payment_key: key, status: 'pending', settlement, branch_id: branchId, branch_name: branch.name || '',
          supplier_id: supplierId, supplier_name: supplier.name || '', amount, payment_date: paymentDate,
          payment_method: method, allocations: allocate(invoices, amount), ledger_entry_ids: [],
          confirmation_file_uri: String(body.confirmation_file_uri || ''), confirmation_file_name: String(body.confirmation_file_name || ''),
          notes, recorded_by_email: user.email, recorded_by_name: user.full_name || user.email,
        });
      }
      const ids = [];
      let methodName = '';
      for (const a of record.allocations || []) {
        const res = await paySupplier(ctx, {
          invoice_id: a.invoice_id, amount: a.amount, entry_date: record.payment_date, payment_method: record.payment_method,
          notes: `${record.notes || 'Supplier payment'} (${a.invoice_number || 'invoice'})`.slice(0, 1000), request_key: await allocationKey(key, a.invoice_id),
        });
        ids.push(res.entry.id);
        methodName = res.entry.payment_method_name || methodName;
      }
      return svc.entities.SupplierPayment.update(record.id, { status: 'posted', ledger_entry_ids: ids, payment_method_name: methodName });
    });

    return Response.json({ payment: result, duplicate: false });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal server error' }, { status: [400, 401, 403, 404, 409].includes(error.status) ? error.status : 500 });
  }
}