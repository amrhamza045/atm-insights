import { financePermission } from './financeAccess.js';
import { healthAnalysis } from './financeHealthScope.js';
import { buildHealthRepair } from './financeHealthRepairPreview.js';
import { requireValue } from './financeValidation.js';
import { projectFinanceJournal } from './financeLedger.js';
import { postModule } from './financeModulePosting.js';
export async function applyHealthRepair(ctx,company,input){
 financePermission(ctx,'finance_journal_approve');const report=await healthAnalysis(ctx,company,input),entity=ctx.svc.entities.FinanceHealthReview,review=await entity.get(input.review_id);
 requireValue(review.company_id===company.id&&review.analysis_id===report.id&&review.branch_id===report.branch_id,'Repair approval is outside this report scope.',403);
 requireValue(review.status==='pending','Approval is no longer pending. Refresh the health check before retrying.',409);
 if(input.cancel===true){await entity.update(review.id,{status:'rejected',reviewed_by_id:ctx.user.id,reviewed_at:new Date().toISOString(),decision_note:'Repair cancelled; nothing applied.'});return {cancelled:true};}
 requireValue(input.confirmed===true&&typeof input.reason==='string'&&input.reason.trim().length>=3&&input.reason.length<=1000,'Explicit approval and a reason are required.');
 const request=JSON.parse(review.evidence_note),built=await buildHealthRepair(ctx,company,report,request.kind,request.target_id);requireValue(built.fingerprint===request.fingerprint,'Source, mappings or reporting evidence changed. Cancel and preview again.',409);
 await entity.update(review.id,{status:'approved',reviewed_by_id:ctx.user.id,reviewed_at:new Date().toISOString(),decision_note:`Execution approved: ${input.reason.trim()}`});
 await ctx.base44.asServiceRole.entities.FinanceAuditEvent.create({company_id:company.id,branch_id:review.branch_id,actor_id:ctx.user.id,actor_email:ctx.user.email,actor_type:'user',request_id:ctx.auditRequestId,operation:'health_repair_approve',action:'approve',entity_type:'FinanceHealthReview',entity_id:review.id,entity_label:built.preview.title,before:{status:'pending'},after:{status:'approved',repair:built.preview.kind,target_id:built.preview.target_id},changed_fields:['status'],reason:input.reason.trim()});
 let result;
 if(request.kind==='index'){await projectFinanceJournal(ctx,company,built.journal);result={prepared:true,journal_id:built.journal.id};}
 else result=await postModule(ctx,company,built.issue.source_entity,built.source,built.preview.entry_date,false);
 const message=result.blocked?`Approved retry remains blocked: ${result.message}`:result.skipped?`No posting performed: ${result.reason}`:result.prepared?'Reporting index prepared. Run a new health check.':'Validated posting completed. Run a new health check.';
 await entity.update(review.id,{decision_note:`${input.reason.trim()} | ${message}`});
 return {result,message,requires_new_scan:true};
}