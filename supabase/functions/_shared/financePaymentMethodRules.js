import { requireValue } from './financeValidation.js';
import { methodCodes } from './financePaymentMethodSource.js';
export function paymentMethodAccount(company,account){
 requireValue(account?.company_id===company.id&&account.active&&account.posting&&account.classification==='assets'&&account.management_mapping,'Select an active cash, bank or clearing asset posting account in this company with a reporting mapping.');
}
// True when any of these codes (or the method itself) is on recorded transactions or accounting links.
export async function paymentCodesHaveHistory(ctx,company,codes,methodId=''){
 const e=ctx.svc.entities,branch_id={$in:company.branch_ids},code={$in:codes},byId=v=>methodId?[v]:[];
 const counts=await Promise.all([
  e.CateringPayment.count({$or:[...byId({payment_method_id:methodId}),{branch_id,payment_method:code}]}),
  e.JournalEntry.count({branch_id,payment_method:code}),
  e.FinanceJournal.count({company_id:company.id,$or:[{'source_summary.mapped_payment.payment_method':code},...byId({'source_summary.payment_method_id':methodId}),...byId({'source_summary.mapping_bindings.binding_id':methodId}),...byId({'lines.binding_id':methodId})]}),
  e.FinanceProposal.count({company_id:company.id,$or:[{'source_summary.payment_method':code},...byId({'lines.binding_id':methodId})]}),
  e.Order.count({branch_id,$or:[{payment_method:code},{secondary_payment_method:code},{'split_check.splits.payment_method':code}]}),
  e.FinanceAccountBinding.count({company_id:company.id,'conditions.payment_method':code}),
  e.SupplierLedgerEntry.count({company_id:company.id,payment_method:code}),
  e.PayrollDisbursement.count({branch_id,payment_method:code}),
  e.EmployeeBorrowing.count({branch_id,payment_method:code}),
  e.Expense.count({branch_id,payment_method:code}),
  e.FinanceCustodyEntry.count({company_id:company.id,payment_method:code}),
  ...(methodId?[e.FinanceOpeningBalance.count({company_id:company.id,payment_method_id:methodId})]:[])
 ]);
 return counts.some(n=>n>0);
}
export async function paymentMethodHasHistory(ctx,company,method){
 if(method.has_transactions)return true;
 return paymentCodesHaveHistory(ctx,company,methodCodes(method),method.id);
}