import { financePermission, financeBranch } from './financeAccess.js';
import { healthAnalysis } from './financeHealthScope.js';
import { requireValue } from './financeValidation.js';
import { previewModule, moduleSource } from './financeModulePosting.js';
export async function repairFingerprint(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function buildHealthRepair(ctx,company,record,kind,targetId){
 financePermission(ctx,'finance_journal_approve');requireValue(['index','retry'].includes(kind),'This issue requires its existing reviewed configuration or accounting workflow.');
 if(kind==='index'){
  const journal=await ctx.svc.entities.FinanceJournal.get(targetId);requireValue(journal.company_id===company.id,'Journal is outside this company.',403);financeBranch(ctx,company,journal.branch_id);
  requireValue(!record.branch_id||record.branch_id===journal.branch_id,'Journal is outside this report branch.',403);
  requireValue(journal.entry_date>=record.from&&journal.entry_date<=record.to&&journal.status==='posted','Journal is outside the report period.');
  requireValue(!journal.ledger_ready||journal.analytics_version!==1,'The reporting index is already prepared. Run a new health check.',409);
  const accounts=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:journal.lines.map(l=>l.account_id)}},{limit:100});
  const preview={kind,target_id:journal.id,title:'Prepare derived reporting index',effect:'Rebuild reporting lines from this already-posted journal. No payment, posting settings, journal amount or recognition policy is changed.',entry_date:journal.entry_date,currency:company.currency,total_debit:journal.total_debit,total_credit:journal.total_credit,lines:journal.lines};
  return {preview,fingerprint:await repairFingerprint({journal,accounts:accounts.items}),journal};
 }
 const issue=await ctx.svc.entities.FinancePostingIssue.get(targetId);requireValue(issue.company_id===company.id&&issue.status==='open','Open posting exception not found.',404);financeBranch(ctx,company,issue.branch_id);requireValue(!record.branch_id||record.branch_id===issue.branch_id,'Exception is outside this report branch.',403);
 requireValue(['Order','PurchaseInvoice'].includes(issue.source_entity),'Operational-journal retries require review through Automatic posting.');
 requireValue(company.module_policy?.enabled,'Transaction connections are disabled. Review configuration first.');
 const source=await moduleSource(ctx,company,issue.source_entity,issue.source_id);requireValue(source.branch_id===issue.branch_id,'Source branch changed. Reconcile the exception first.');
 if(issue.source_entity==='Order')requireValue(source.status==='paid','Completed orders require separate payment-evidence review; a health repair cannot infer payment.');
 const built=await previewModule(ctx,company,{source_entity:issue.source_entity,source_id:source.id,entry_date:issue.entry_date,confirmed_paid:false});
 requireValue(built.entry_date>=company.module_policy.from,'Source predates the connection start; use historical review.');
 const preview={kind,target_id:issue.id,title:'Retry one validated source posting',effect:'May create one posted Finance journal using current approved connection settings. No new payment is collected. Closed-period and duplicate guards remain enforced.',source_entity:issue.source_entity,source_id:source.id,entry_date:built.entry_date,currency:company.currency,total_debit:built.total_debit,total_credit:built.total_credit,lines:built.lines};
 return {preview,fingerprint:await repairFingerprint({issue,source_version:source.updated_date,token:built.token,policy:company.module_policy}),issue,source};
}
export async function prepareHealthRepair(ctx,company,input){
 const record=await healthAnalysis(ctx,company,input),built=await buildHealthRepair(ctx,company,record,input.kind,input.target_id);
 const review=await ctx.svc.entities.FinanceHealthReview.create({analysis_id:record.id,company_id:company.id,branch_id:record.branch_id,finding_id:`${input.kind}:${input.target_id}`,submitted_by_id:ctx.user.id,proposed_status:`repair:${input.kind}`,previous_status:'open',evidence_type:'static_review',evidence_note:JSON.stringify({kind:input.kind,target_id:input.target_id,fingerprint:built.fingerprint}),remediation_note:built.preview.effect,status:'pending'});
 return {review_id:review.id,preview:built.preview};
}