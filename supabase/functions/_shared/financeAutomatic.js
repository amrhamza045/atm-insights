import { financePermission, financeBranch, branchQuery } from './financeAccess.js';
import { requireValue, validDate, validateLines } from './financeValidation.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';
import { audit } from './auditLog.js';
import { noModuleDuplicate } from './financeModuleRules.js';
import { postMappedAdvance } from './financeMappedAdvancePosting.js';
import { postPaymentVoid } from './financePaymentVoid.js';
export async function configureFinanceAutomatic(ctx,company,data) {
 financePermission(ctx,'finance_company_manage');financePermission(ctx,'finance_journal_approve');
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Automation setup requires unrestricted company branch access.',403);
 if(data.enabled===false)return {company:await ctx.svc.entities.FinanceCompany.update(company.id,{auto_post_enabled:false})};
 requireValue(data.confirmed===true,'Confirm automatic posting without individual approval and the operational source currency.');
 requireValue(validDate(data.from),'Choose a valid start date.');openFinanceDate(company,data.from);
 requireValue(data.source_currency===company.currency,'Source currency must equal company currency; automatic currency conversion is not supported.');
 const map=data.account_map;requireValue(map&&typeof map==='object'&&!Array.isArray(map),'Map operational accounts to company accounts.');
 const keys=Object.keys(map);requireValue(keys.length>0&&keys.length<=100,'Map 1–100 operational accounts.');
 const gl=await ctx.svc.entities.GLAccount.filter({id:{$in:keys}},{limit:100});requireValue(gl.items.length===keys.length,'An operational account no longer exists.');
 const ids=[...new Set(Object.values(map))];requireValue(ids.every(id=>typeof id==='string'&&id),'Choose every destination account.');
 const accounts=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:ids},active:true,posting:true},{limit:100});
 requireValue(accounts.items.length===ids.length&&accounts.items.every(a=>a.management_mapping),'Every mapping needs an active company posting account with a reporting mapping.');
 return {company:await ctx.svc.entities.FinanceCompany.update(company.id,{auto_post_enabled:true,auto_post_from:data.from,auto_source_currency:data.source_currency,auto_account_map:map,auto_configured_by:ctx.user.email,auto_configured_at:new Date().toISOString()})};
}
function sourceSnapshot(source) {return {description:source.description,reference_type:source.reference_type,reference_id:source.reference_id,entry_date:source.entry_date,entries:source.entries};}
export async function postFinanceSource(ctx,company,source,options={}) {
 financeBranch(ctx,company,source.branch_id);
 const reversal=await postPaymentVoid(ctx,company,source,options);if(reversal)return reversal;
  const mapped=await postMappedAdvance(ctx,company,source,options);if(mapped)return mapped;
 if(options.dryRun)return {preview:true,posting_enabled:!!company.auto_post_enabled,reason:'No live semantic advance mapping applies. Existing operational-account posting policy is unchanged.'};
 if(!company.auto_post_enabled)return {skipped:true,reason:'Automatic posting is disabled and no live semantic mapping applies.'};
 financeBranch(ctx,company,source.branch_id);
 const key=`${company.id}:legacy:${source.id}`,date=String(source.entry_date||'').slice(0,10);
 if(date<company.auto_post_from)return {skipped:true,reason:'Before the automatic posting start date.'};
 try {
  requireValue(source.posted===true,'The operational journal is no longer posted.');
  const prior=await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,posting_key:key,status:'posted'},{limit:1});
  if(prior.items.length) {
   const journal=prior.items[0];requireValue(JSON.stringify(journal.source_summary.entries)===JSON.stringify(source.entries)&&journal.branch_id===source.branch_id&&journal.entry_date===date,'The operational journal changed after posting. Correct it with a reversing journal; existing ledger entries are immutable.');
   await projectFinanceJournal(ctx,company,journal);
   await ctx.svc.entities.FinancePostingIssue.updateMany({issue_key:key,status:'open'},{$set:{status:'resolved',resolved_at:new Date().toISOString()}});
   return {already_posted:true,journal_id:journal.id};
  }
  await noModuleDuplicate(ctx,company,source);
  openFinanceDate(company,date);
  requireValue(company.auto_source_currency===company.currency,'Confirm the source currency in automatic posting settings.');
  requireValue(source.revenue_source!=='catering'||company.currency==='EGP','Catering journals are recorded in EGP; map them to an EGP company.');
  requireValue(!await ctx.svc.entities.FinanceProposal.count({company_id:company.id,source_key:key,status:'pending'}),'This source has a pending historical proposal. Resolve that proposal before automatic posting.');
  requireValue(Array.isArray(source.entries)&&source.entries.length>=2,'The source needs a complete balanced journal.');
  const raw=source.entries.map(l=>{const id=company.auto_account_map?.[l.gl_account_id];requireValue(id,`Map operational account ${l.account_number||l.gl_account_id} before posting.`);return {account_id:id,debit:l.debit??0,credit:l.credit??0,cost_center:source.branch_id,channel:source.revenue_source||source.reference_type,product_reference:source.reference_id||''};});
  const totals=validateLines(raw,company.currency_decimals),lines=await checkedAccounts(ctx,company,raw,date);
  const journal=await ctx.svc.entities.FinanceJournal.create({company_id:company.id,branch_id:source.branch_id,proposal_id:`automatic:${source.id}`,posting_key:key,status:'posted',entry_date:date,description:source.description,kind:'automatic',currency:company.currency,business_edition:company.edition,source_id:source.id,source_entity:'JournalEntry',source_version:source.updated_date,source_summary:sourceSnapshot(source),lines,...totals,prepared_by:'Automatic posting',prepared_by_id:'system',reviewed_by:'Automatic posting policy',reviewed_by_id:'system',reviewed_at:new Date().toISOString(),review_note:`Automatic posting enabled by ${company.auto_configured_by}.`,rule_version:'automatic-operational-v1',evidence_note:'Mirrors a posted, balanced operational journal using the configured company account mappings. No new recognition or tax treatment is inferred.',is_test:!!company.is_test,ledger_ready:false});
  await projectFinanceJournal(ctx,company,journal);
  await ctx.svc.entities.FinancePostingIssue.updateMany({issue_key:key,status:'open'},{$set:{status:'resolved',resolved_at:new Date().toISOString()}});
  await audit(ctx.base44,ctx.user,'create','FinanceJournal','Automatically posted operational journal',{entityId:journal.id,changes:{source_id:source.id,company_id:company.id}});
  return {posted:true,journal_id:journal.id};
 }catch(error) {
  if(error.status&&error.status!==400&&error.status!==409)throw error;
  await ctx.svc.entities.FinancePostingIssue.upsert([{issue_key:key,company_id:company.id,branch_id:source.branch_id,source_id:source.id,source_description:source.description,entry_date:date,status:'open',message:error.message,last_attempt_at:new Date().toISOString(),resolved_at:''}],{key:'issue_key'});
  return {blocked:true,message:error.message};
 }
}
export async function syncFinanceSources(ctx,company,input) {
 financePermission(ctx,'finance_journal_approve');requireValue(company.auto_post_enabled,'Enable automatic posting first.');
 const page=await ctx.svc.entities.JournalEntry.filter({...branchQuery(ctx,company),posted:true,entry_date:{$gte:company.auto_post_from}},{sort:'created_date',limit:25,...(input.cursor?{cursor:input.cursor}:{})});
 let posted=0,already_posted=0,blocked=0;for(const source of page.items){const r=await postFinanceSource(ctx,company,source);if(r.posted)posted++;if(r.already_posted)already_posted++;if(r.blocked)blocked++;}
 return {posted,already_posted,blocked,has_more:page.has_more,next_cursor:page.next_cursor};
}