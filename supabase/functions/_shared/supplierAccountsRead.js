import { requireValue } from './financeValidation.js';
import { supplierEntries, supplierBalance } from './supplierAccountsAccess.js';
export async function readSupplierAccounts(ctx, input) {
  requireValue(!input.cursor || typeof input.cursor === 'string' && input.cursor.length < 3000, 'Invalid page cursor.');
  const options = {limit: 25, ...(input.cursor ? {cursor: input.cursor} : {})}, e = supplierEntries(ctx);
  if (input.action === 'choices') {
    if (input.type === 'methods') return ctx.svc.entities.FinancePaymentMethod.filter({company_id: ctx.company.id, is_active: true}, {...options, sort: 'name'});
    requireValue(input.type === 'offsets', 'Unknown account choice.');
    return ctx.svc.entities.FinanceAccount.filter({company_id: ctx.company.id, active: true, posting: true, classification: 'equity'}, {...options, sort: 'code'});
  }
  if (input.action === 'history') return e.filter(ctx.query, {...options, sort: '-created_date'});
  const opening = (await e.filter({...ctx.query, kind: 'opening', status: 'posted'}, {limit: 1})).items[0] || null;
  const invoiceQuery = {branch_id: ctx.branch, supplier_id: ctx.supplier.id, status: {$ne: 'draft'}};
  if (input.action === 'summary') {
    const eligible = {...invoiceQuery, ...(opening ? {invoice_date: {$gt: opening.entry_date}} : {})};
    const [openingOutstanding, balance, invoiceCount, registered, pending, covered] = await Promise.all([supplierBalance(ctx, {invoice_id: ''}), supplierBalance(ctx), ctx.svc.entities.PurchaseInvoice.count(eligible), e.count({...ctx.query, kind: 'invoice', status: 'posted', ...(opening ? {entry_date: {$gt: opening.entry_date}} : {})}), e.count({...ctx.query, status: 'pending'}), opening ? ctx.svc.entities.PurchaseInvoice.count({...invoiceQuery, invoice_date: {$lte: opening.entry_date}}) : 0]);
    return {balance, opening_outstanding: openingOutstanding, currency: ctx.company.currency, company_name: ctx.company.name, supplier_name: ctx.supplier.name, legacy_reported_balance: Number(ctx.supplier.total_outstanding || 0), legacy_scope: 'all branches; unreconciled and not added to this balance', review_count: Math.max(0, invoiceCount - registered), covered_count: covered, pending_count: pending, opening};
  }
  requireValue(input.action === 'invoices', 'Unknown supplier account action.');
  const page = await ctx.svc.entities.PurchaseInvoice.filter(invoiceQuery, {...options, sort: '-invoice_date'}), ids = page.items.map(i => i.id);
  const [charges, totals, credits] = ids.length ? await Promise.all([e.filter({...ctx.query, kind: 'invoice', invoice_id: {$in: ids}}, {limit: 100}), e.aggregate({query: {...ctx.query, invoice_id: {$in: ids}, status: 'posted'}, groupBy: 'invoice_id', sum: ['delta']}), e.aggregate({query: {...ctx.query, invoice_id: {$in: ids}, status: 'posted', kind:'supplier_return'}, groupBy:'invoice_id', sum:['delta']})]) : [{items: []}, {rows: []}, {rows: []}];
  requireValue(!charges.has_more && !totals.truncated && !credits.truncated, 'Invoice ledger requires review before displaying balances.');
  return {...page, items: page.items.map(i => {
    const charge = charges.items.find(c => c.invoice_id === i.id), remaining = charge ? Math.round(Number(totals.rows.find(r => r.invoice_id === i.id)?.sum_delta || 0) * 100) / 100 : null;
    const returned = -Number(credits.rows.find(r => r.invoice_id === i.id)?.sum_delta || 0);
    return {id: i.id, invoice_number: i.invoice_number, invoice_date: i.invoice_date, total_amount: i.total_amount, registered: charge?.status === 'posted', pending: charge?.status === 'pending', reviewed_paid: charge?.reviewed_paid, review_notes: charge?.notes || '', due_date: charge?.due_date || '', outstanding: remaining, returned, returnable: i.status === 'posted' && charge?.status === 'posted', paid: charge ? Math.round((charge.delta - remaining - returned) * 100) / 100 : null, covered: !!opening && i.invoice_date <= opening.entry_date};
  })};
}