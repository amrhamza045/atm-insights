import { requireValue } from './financeValidation.js';
import { withFinanceLock } from './financeAccess.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { loadMappingBindings, resolveMappingLines } from './financeBindingResolver.js';
import { cateringPaymentKeys } from './financeCateringPaymentTypes.js';
import { paymentMethodAccount } from './financePaymentMethodRules.js';
export async function paymentCompany(svc,branchId){
 const page=await svc.entities.FinanceCompany.filter({is_active:{$ne:false},branch_ids:branchId},{limit:2});
 requireValue(page.items.length===1&&!page.has_more,'Assign this branch to exactly one active accounting company before recording payments.',409);
 return page.items[0];
}
export async function capturePaymentAccounts(svc,event,data){
 requireValue(typeof data.payment_method==='string'&&data.payment_method.trim(),'Select a configured payment method.');
 const company=await paymentCompany(svc,event.branch_id),ctx={svc};
 return withFinanceLock(ctx,company,async fresh=>{
  const page=await svc.entities.FinancePaymentMethod.filter({company_id:fresh.id,code:data.payment_method},{limit:2});
  requireValue(page.items.length===1&&!page.has_more,'Configure this payment method in Finance › Mapping Accounts › Payment methods.');
  const method=page.items[0];requireValue(method.is_active===true,'This payment method is inactive. Choose an active payment method.');
  const date=String(data.payment_date||new Date().toISOString()).slice(0,10);
  requireValue(fresh.currency==='EGP','Catering payments require an EGP accounting company.');openFinanceDate(fresh,date);
  paymentMethodAccount(fresh,await svc.entities.FinanceAccount.get(method.account_id));
  const sample={date,dimensions:{branch_id:event.branch_id,event_id:event.id,customer_id:event.client_id,payment_type:data.payment_type,payment_method:method.code,currency:fresh.currency,channel:'catering'}};
  const definitions=cateringPaymentKeys(data).map(account_key=>account_key==='PAYMENT_METHOD_ACC'?{account_id:method.account_id,method_key:account_key}:{account_key});
  const bindings=await loadMappingBindings(ctx,fresh,definitions),resolved=await resolveMappingLines(ctx,fresh,definitions,sample,bindings);
  const accounts=await checkedAccounts(ctx,fresh,resolved.map(l=>({...l,debit:0,credit:0})),date);
  const keys=cateringPaymentKeys(data);
  for(let i=0;i<keys.length;i++)requireValue(accounts[i].account_code.startsWith(keys[i]==='PAYMENT_METHOD_ACC'?'1':keys[i]==='CUSTOMER_ADVANCE_ACC'?'2':'4'),'Customer advances require a liability account; cancellation income requires a revenue account.');
  // Mark before creating a payment, under the same company lock as deletion. A failed submission is conservatively retained.
  if(!method.has_transactions)await svc.entities.FinancePaymentMethod.update(method.id,{has_transactions:true});
  return {payment_method:method.code,payment_method_id:method.id,payment_account_snapshot:{company_id:fresh.id,method_id:method.id,method_code:method.code,method_name:method.name,method_updated_date:method.updated_date,accounts:accounts.map((a,i)=>({...a,account_key:keys[i]}))}};
 });
}