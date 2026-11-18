import { requireValue, validateLines } from './financeValidation.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { withFinanceLock } from './financeAccess.js';
import { cateringPaymentKeys } from './financeCateringPaymentTypes.js';
export function configuredPaymentLines(payment,decimals){
 const accounts=payment.payment_account_snapshot?.accounts||[],keys=cateringPaymentKeys(payment);
 const lines=keys.map((key,i)=>{const a=accounts.find(a=>a.account_key===key);requireValue(a?.account_id,'The payment account snapshot is incomplete. Review the pending payment.');return {account_id:a.account_id,debit:i===0?payment.amount:0,credit:i===1?payment.amount:0,cost_center:payment.event_id,channel:'catering',product_reference:payment.event_id,counterparty_reference:payment.client_id};});
 return {lines,...validateLines(lines,decimals)};
}
export async function configuredPaymentJournal(svc,payment,event){
 const saved=payment.payment_account_snapshot,company=await svc.entities.FinanceCompany.get(saved.company_id);
 requireValue(company.is_active!==false&&company.branch_ids.includes(event.branch_id)&&payment.branch_id===event.branch_id,'Payment accounting company does not own this event branch.');
 const payload=await withFinanceLock({svc},company,async fresh=>{
  const method=await svc.entities.FinancePaymentMethod.get(payment.payment_method_id);
  requireValue(method.company_id===fresh.id&&method.code===payment.payment_method&&method.id===saved.method_id,'Payment method does not match its company snapshot.');
  requireValue(method.is_active===true,'This payment method was deactivated. Edit the pending payment to choose an active method.');
  const date=String(payment.payment_date).slice(0,10);openFinanceDate(fresh,date);
  const plan=configuredPaymentLines(payment,fresh.currency_decimals),lines=await checkedAccounts({svc},fresh,plan.lines,date),entries=[];
  // Bridge the operational ledger to the same company accounts; no default account numbers or names.
  for(const a of lines){
   const definition=saved.accounts.find(item=>item.account_id===a.account_id),description=`finance-account:${fresh.id}:${a.account_id}`;
   const found=await svc.entities.GLAccount.filter({description},{limit:2});requireValue(found.items.length<=1&&!found.has_more,'Duplicate operational account links require review.',409);
   const classification=definition.account_key==='PAYMENT_METHOD_ACC'?'assets':definition.account_key==='CUSTOMER_ADVANCE_ACC'?'liabilities':'revenue';
   const gl=found.items[0]||await svc.entities.GLAccount.create({account_number:a.account_code,account_name:a.account_name,category:classification,account_type:classification==='assets'?'asset':classification==='liabilities'?'liability':'revenue',is_active:true,description});
   entries.push({gl_account_id:gl.id,account_number:a.account_code,debit:a.debit,credit:a.credit});
  }
  return {branch_id:event.branch_id,branch_name:event.branch_name||'',entry_date:payment.payment_date,reference_type:payment.payment_type==='refund'?'catering_credit_note':payment.payment_type==='deposit_withdrawal'?'catering_deposit_withdrawal':'catering_payment',reference_id:payment.id,revenue_source:'catering',catering_event_id:event.id,catering_event_name:event.event_name||'',description:`Catering ${payment.payment_type.replaceAll('_',' ')} — ${payment.event_name} · ${saved.method_name}`,entries,total_debit:plan.total_debit,total_credit:plan.total_credit,is_balanced:true,posted:true};
 });
 // Release the company lock before the operational-journal trigger invokes the accounting gateway.
 return svc.entities.JournalEntry.create(payload);
}