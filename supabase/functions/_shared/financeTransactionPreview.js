import { transactionEvidence, requireUnposted } from './financeTransactionEvidence.js';
import { transactionDate, transactionSnapshot } from './financeTransactionSources.js';
import { requireValue, validateLines } from './financeValidation.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { mappedAdvancePlan } from './financeMappedAdvance.js';
import { previewModule } from './financeModulePosting.js';
import { repairFingerprint } from './financeHealthRepairPreview.js';
export async function previewTransactionRecovery(ctx,company,input){
 const e=await transactionEvidence(ctx,company,input.source_entity,input.source_id);requireUnposted(e);
 const s=e.target,date=transactionDate(e.def,e.source);let built;
 if(e.targetEntity==='JournalEntry'){
  const semantic=await mappedAdvancePlan(ctx,company,s);
  if(semantic)built={entry_date:semantic.date,lines:semantic.lines,total_debit:semantic.total_debit,total_credit:semantic.total_credit,path:'semantic'};
  else{
   requireValue(company.auto_post_enabled,'Automatic operational posting is disabled.');
   const accountingDate=String(s.entry_date||'').slice(0,10);requireValue(accountingDate>=company.auto_post_from,'Before the automatic posting start date.');openFinanceDate(company,accountingDate);
   requireValue(company.auto_source_currency===company.currency,'Source currency must match company currency.');requireValue(s.revenue_source!=='catering'||company.currency==='EGP','Catering source currency is EGP.');
   const raw=(s.entries||[]).map(l=>{const account_id=company.auto_account_map?.[l.gl_account_id];requireValue(account_id,`Missing account mapping for operational account ${l.account_number||l.gl_account_id}.`);return {account_id,debit:l.debit||0,credit:l.credit||0,cost_center:s.branch_id,channel:s.revenue_source||s.reference_type,product_reference:s.reference_id||''};});
   built={entry_date:accountingDate,lines:await checkedAccounts(ctx,company,raw,accountingDate),...validateLines(raw,company.currency_decimals),path:'operational'};
  }
 }else if(['Order','PurchaseInvoice'].includes(e.targetEntity)){
  if(e.targetEntity==='Order')requireValue(company.module_policy?.enabled,'Sales / purchasing transaction connections are disabled.');
  if(e.targetEntity==='Order')requireValue(input.confirmed_paid===true&&input.entry_date,'Confirm payment evidence and the original payment accounting date.');
  built={...await previewModule(ctx,company,{source_entity:e.targetEntity,source_id:s.id,entry_date:input.entry_date||date,confirmed_paid:input.confirmed_paid===true}),path:'module'};
  if(built.posting_path!=='mapped_purchase'){
    requireValue(company.module_policy?.enabled,'Sales / purchasing transaction connections are disabled.');
    requireValue(built.entry_date>=company.module_policy.from,'Before the transaction connection start date; use a reviewed one-time correction.');
   }
 }else throw Object.assign(new Error(e.targetEntity==='CateringPayment'?'No operational journal exists for this completed catering payment. Reconcile it or use a one-time journal.':'No live posting adapter exists for this source without an operational journal. One-time independent review is available; saving a draft rule would not activate automation.'),{status:400});
 const preview={source_entity:input.source_entity,source_id:input.source_id,target_entity:e.targetEntity,target_id:s.id,source_version:e.source.updated_date,entry_date:built.entry_date,currency:company.currency,lines:built.lines,total_debit:built.total_debit,total_credit:built.total_credit,path:built.path};
 return {...preview,token:await repairFingerprint({preview,source:transactionSnapshot(e.source),target:transactionSnapshot(s),auto:company.auto_account_map,policy:company.module_policy}),confirmed_paid:input.confirmed_paid===true};
}