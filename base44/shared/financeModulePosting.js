import { MODULE_ACCOUNTS, moduleSnapshot, noLinkedLegacy } from './financeModuleRules.js';
import { buildRoutedModuleJournal, validatePurchaseAccounts } from './financeMappedPurchase.js';
export { noLinkedLegacy } from './financeModuleRules.js';
import { requireValue, validDate, validateLines } from './financeValidation.js';
import { financePermission, financeBranch, branchQuery } from './financeAccess.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';
import { audit } from './auditLog.js';
export const moduleKey=(company,entity,id)=>`${company.id}:module:${entity}:${id}`;
export async function moduleMappings(ctx,company){const map=company.module_policy?.map||{},ids=[...new Set(Object.values(map))];if(!ids.length)return {};const {items}=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:ids}},{limit:100});return Object.fromEntries(Object.entries(map).map(([role,id])=>{const a=items.find(a=>a.id===id);return [role,a?{account_id:a.id,account_code:a.code,account_name:a.name}:{}];}));}
export async function configureModules(ctx,company,data){
 financePermission(ctx,'finance_company_manage');financePermission(ctx,'finance_journal_approve');requireValue(ctx.admin||!ctx.permissions.branch_id,'Connection setup requires unrestricted company branch access.',403);
 if(data.enabled===false)return {company:await ctx.svc.entities.FinanceCompany.update(company.id,{module_policy:{...company.module_policy,enabled:false}})};
 requireValue(data.confirmed===true,'Confirm currency, mappings and automatic posting.');openFinanceDate(company,data.from);requireValue(data.map&&typeof data.map==='object','Map the transaction accounts.');
 const keys=Object.keys(MODULE_ACCOUNTS),ids=keys.map(k=>data.map[k]);requireValue(ids.every(id=>typeof id==='string'&&id),`Map all ${keys.length} transaction accounts.`);
 const {items}=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:ids},active:true,posting:true},{limit:100});
 for(const role of keys){const a=items.find(a=>a.id===data.map[role]);requireValue(a&&a.management_mapping&&a.classification===MODULE_ACCOUNTS[role],`The ${role} mapping needs an active ${MODULE_ACCOUNTS[role]} posting account with reporting mappings.`);if(['cash','bank'].includes(role))requireValue(['110100','110200','110300'].includes(a.code),'Map confirmed collections to a cash/bank account supported by the cash-flow statement.');}
 requireValue(!await ctx.svc.entities.FinanceCompany.count({id:{$ne:company.id},is_active:{$ne:false},'module_policy.enabled':true,branch_ids:{$in:company.branch_ids}}),'Another enabled company owns one of these branches.',409);
 const policy={enabled:true,from:data.from,map:Object.fromEntries(keys.map(k=>[k,data.map[k]])),configured_by:ctx.user.email,configured_at:new Date().toISOString()};return {company:await ctx.svc.entities.FinanceCompany.update(company.id,{module_policy:policy})};
}
export async function moduleSource(ctx,company,entity,id){requireValue(['Order','PurchaseInvoice'].includes(entity),'Unsupported transaction source.');requireValue(typeof id==='string'&&id,'A source ID is required.');const s=await ctx.svc.entities[entity].get(id);requireValue(s,'Source no longer exists.',404);financeBranch(ctx,company,s.branch_id);return s;}
export async function previewModule(ctx,company,input){
 const entity=input.source_entity,s=await moduleSource(ctx,company,entity,input.source_id);await noLinkedLegacy(ctx,company,s);
 const key=moduleKey(company,entity,s.id);requireValue(!await ctx.svc.entities.FinanceJournal.count({company_id:company.id,posting_key:key,status:'posted'}),'This transaction has already been posted.',409);
 const date=entity==='PurchaseInvoice'?s.invoice_date:input.entry_date;openFinanceDate(company,date);
 requireValue(!await ctx.svc.entities.FinanceProposal.count({company_id:company.id,source_key:key,status:'pending'}),'A historical proposal is pending review.',409);
 const built=await buildRoutedModuleJournal(ctx,company,entity,s,date,{confirmedPaid:input.confirmed_paid===true});const totals=validateLines(built.lines,company.currency_decimals),lines=await checkedAccounts(ctx,company,built.lines,date);validatePurchaseAccounts(built,lines);
 return {...built,lines,...totals,source_id:s.id,source_entity:entity,source_version:s.updated_date,branch_id:s.branch_id,posting_key:key,token:JSON.stringify({snapshot:built.source_snapshot,date,lines})};
}
export async function historyModule(ctx,company,input){financePermission(ctx,'finance_reconstruct');requireValue(['Order','PurchaseInvoice'].includes(input.source_entity),'Choose a transaction source.');const query={...branchQuery(ctx,company)};if(input.source_entity==='Order')query.status={$in:['paid','completed']};else query.status={$ne:'draft'};
 const range={};if(input.from){requireValue(validDate(input.from),'Invalid start date.');range.$gte=input.from;}if(input.to){requireValue(validDate(input.to),'Invalid end date.');range.$lt=new Date(Date.parse(input.to)+86400000).toISOString();}requireValue(!input.from||!input.to||input.from<=input.to,'Start date must not follow end date.');if(Object.keys(range).length)query.created_date=range;
 return await ctx.svc.entities[input.source_entity].filter(query,{sort:'created_date',limit:25,...(input.cursor?{cursor:input.cursor}:{}),fields:['status','branch_id','total','total_amount','invoice_number','invoice_date']});
}
export async function prepareModule(ctx,company,input){
 financePermission(ctx,'finance_reconstruct');requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.request_id||''),'A valid unique submission identifier is required.');requireValue(typeof input.evidence_note==='string'&&input.evidence_note.trim(),'Document reconciliation and supporting payment/invoice evidence.');
 const p=await previewModule(ctx,company,input);requireValue(input.preview_token===p.token,'The source or mappings changed since preview; preview again.',409);
 const prior=await ctx.svc.entities.FinanceProposal.filter({company_id:company.id,source_key:p.posting_key,status:'pending'},{limit:1});if(prior.items.length)return {proposal:prior.items[0],already_prepared:true};
 const proposal=await ctx.svc.entities.FinanceProposal.create({company_id:company.id,branch_id:p.branch_id,entry_date:p.entry_date,description:p.description,kind:'historical',source_key:p.posting_key,source_id:p.source_id,source_entity:p.source_entity,source_version:p.source_version,source_summary:{source_snapshot:p.source_snapshot,request_id:input.request_id},currency:company.currency,business_edition:company.edition,lines:p.lines,total_debit:p.total_debit,total_credit:p.total_credit,prepared_by:ctx.user.email,prepared_by_id:ctx.user.id,rule_version:'sales-paid-purchases-posted-v1',evidence_note:input.evidence_note.trim(),status:'pending'});return {proposal};
}
export async function moduleIssue(ctx,company,entity,s,date,message){await ctx.svc.entities.FinancePostingIssue.upsert([{issue_key:moduleKey(company,entity,s.id),company_id:company.id,branch_id:s.branch_id,source_id:s.id,source_entity:entity,source_description:`${entity} · ${s.invoice_number||s.id}`,entry_date:date||'',status:'open',message,last_attempt_at:new Date().toISOString(),resolved_at:''}],{key:'issue_key'});}
export async function postModule(ctx,company,entity,s,date,confirmedPaid=false,{dryRun=false}={}){
  if(entity!=='PurchaseInvoice'&&!company.module_policy?.enabled)return {skipped:true,reason:'Transaction connections are disabled.'};financeBranch(ctx,company,s.branch_id);const key=moduleKey(company,entity,s.id);
 try {
  const prior=await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,posting_key:key,status:'posted'},{limit:1});
  if(prior.items.length){const j=prior.items[0];requireValue(JSON.stringify(j.source_summary.source_snapshot)===JSON.stringify(moduleSnapshot(entity,s)),'Financial source data changed after posting; use a reviewed reversal and correction.',409);requireValue(entity==='Order'?['paid','completed'].includes(s.status):s.status==='posted','The source was cancelled or unposted; use a reviewed reversal.',409);if(!dryRun){await projectFinanceJournal(ctx,company,j);await ctx.svc.entities.FinancePostingIssue.updateMany({issue_key:key,status:'open'},{$set:{status:'resolved',resolved_at:new Date().toISOString()}});}return {already_posted:true,journal_id:j.id};}
  const built=await buildRoutedModuleJournal(ctx,company,entity,s,date,{confirmedPaid});
   if(built.posting_path!=='mapped_purchase'){
    if(!company.module_policy?.enabled)return {skipped:true,reason:'Transaction connections are disabled.'};
    if(date&&date<company.module_policy.from)return {skipped:true,reason:'Before the transaction connection start date; use historical review.'};
   }
  await noLinkedLegacy(ctx,company,s);requireValue(!await ctx.svc.entities.FinanceProposal.count({company_id:company.id,source_key:key,status:'pending'}),'A historical proposal is pending review.',409);openFinanceDate(company,date);
  const totals=validateLines(built.lines,company.currency_decimals),lines=await checkedAccounts(ctx,company,built.lines,date);validatePurchaseAccounts(built,lines);
   if(dryRun)return {preview:true,posting_path:built.posting_path||'module',entry_date:date,currency:company.currency,lines,...totals};
  const j=await ctx.svc.entities.FinanceJournal.create({company_id:company.id,branch_id:s.branch_id,proposal_id:`automatic:${entity}:${s.id}`,posting_key:key,status:'posted',entry_date:date,description:built.description,kind:'automatic',currency:company.currency,business_edition:company.edition,source_id:s.id,source_entity:entity,source_version:s.updated_date,source_summary:{source_snapshot:built.source_snapshot,...(built.mapping_bindings?{mapping_bindings:built.mapping_bindings}:{})},lines,...totals,prepared_by:'Automatic transaction posting',prepared_by_id:'system',reviewed_by:'Confirmed module accounting policy',reviewed_by_id:'system',reviewed_at:new Date().toISOString(),review_note:built.posting_path==='mapped_purchase'?'Dated inventory and supplier-payables mappings validated.':`Configured by ${company.module_policy.configured_by}`,rule_version:built.posting_path==='mapped_purchase'?'mapped-purchase-v1':'sales-paid-purchases-posted-v1',evidence_note:entity==='Order'?'Confirmed paid transition; original payment event date.':'Posted inventory supplier invoice; settlement is not inferred.',is_test:!!company.is_test,ledger_ready:false});
  await projectFinanceJournal(ctx,company,j);await ctx.svc.entities.FinancePostingIssue.updateMany({issue_key:key,status:'open'},{$set:{status:'resolved',resolved_at:new Date().toISOString()}});await audit(ctx.base44,ctx.user,'create','FinanceJournal','Automatically posted module transaction',{entityId:j.id,changes:{source_id:s.id,source_entity:entity,company_id:company.id}});return {posted:true,journal_id:j.id};
 }catch(error){if(error.status&&![400,409].includes(error.status))throw error;if(!dryRun)await moduleIssue(ctx,company,entity,s,date,error.message);return {blocked:true,message:error.message};}
}