import { financePermission } from './financeAccess.js';
import { requireValue, validateLines, moneyUnits } from './financeValidation.js';
import { checkedAccounts, openFinanceDate } from './financeProposals.js';
import { transactionEvidence, requireUnposted, confirmTransactionJournal } from './financeTransactionEvidence.js';
import { transactionSnapshot, transactionAmount } from './financeTransactionSources.js';
import { previewTransactionRecovery } from './financeTransactionPreview.js';
import { postFinanceSource } from './financeAutomatic.js';
import { postModule } from './financeModulePosting.js';
import { moduleSnapshot } from './financeModuleRules.js';
export async function recoverTransaction(ctx,company,input){
 financePermission(ctx,'finance_journal_approve');requireValue(input.confirmed===true&&typeof input.reason==='string'&&input.reason.trim().length>=3&&input.reason.length<=1000,'Explicit confirmation and an accounting reason are required.');
 const preview=await previewTransactionRecovery(ctx,company,input);requireValue(preview.token===input.preview_token,'Source or routing changed. Preview again before confirming.',409);
 const e=await transactionEvidence(ctx,company,input.source_entity,input.source_id);requireUnposted(e);
 await ctx.base44.asServiceRole.entities.FinanceAuditEvent.create({company_id:company.id,branch_id:e.source.branch_id,actor_id:ctx.user.id,actor_email:ctx.user.email,actor_type:'user',request_id:ctx.auditRequestId,operation:'transaction_recover_confirm',action:'approve',entity_type:e.def.entity,entity_id:e.source.id,entity_label:'Confirmed transaction recovery',before:{status:'unposted'},after:{entry_date:preview.entry_date,lines:preview.lines},changed_fields:['recovery_approved'],reason:input.reason.trim(),source_entity:e.def.entity,source_id:e.source.id});
 const result=e.targetEntity==='JournalEntry'?await postFinanceSource(ctx,company,e.target):await postModule(ctx,company,e.targetEntity,e.target,preview.entry_date,input.confirmed_paid===true);
 if(!result.journal_id)return {...result,verified:false};
 const linked=await transactionEvidence(ctx,company,input.source_entity,input.source_id);
 requireValue(linked.journals.some(j=>j.id===result.journal_id),'Journal was posted but its transaction link could not be verified. Review the existing journal; do not post again.',409);
 return {...result,...await confirmTransactionJournal(ctx,company,result.journal_id),source_entity:input.source_entity,source_id:input.source_id};
}
export async function prepareTransactionOneTime(ctx,company,input){
 financePermission(ctx,'finance_journal_create');requireValue(input.confirmed===true&&typeof input.reason==='string'&&input.reason.trim().length>=3&&input.reason.length<=2000,'Confirm this one-time correction and document its evidence.');
 const e=await transactionEvidence(ctx,company,input.source_entity,input.source_id);requireUnposted(e);openFinanceDate(company,input.entry_date);
 requireValue(input.source_version===e.source.updated_date&&input.target_version===e.target.updated_date,'Source changed since inspection. Refresh before submitting a one-time journal.',409);
 const totals=validateLines(input.lines,company.currency_decimals),lines=await checkedAccounts(ctx,company,input.lines,input.entry_date),amount=transactionAmount(e.def,e.source);
 requireValue(amount!=null&&Number.isFinite(amount)&&amount>0,'Source valuation is missing or zero. Correct the source evidence before preparing a journal.');
 requireValue(moneyUnits(totals.total_debit,company.currency_decimals)===moneyUnits(amount,company.currency_decimals),'The one-time debit and credit totals must match the recorded source amount.');
 const proposal=await ctx.svc.entities.FinanceProposal.create({company_id:company.id,branch_id:e.source.branch_id,entry_date:input.entry_date,description:`One-time recovery · ${e.def.name} · ${e.source.id}`,kind:'historical',source_key:e.key,source_id:e.target.id,source_entity:e.targetEntity,source_version:e.target.updated_date,source_summary:{audit_origin:{entity:input.source_entity,id:e.source.id,version:e.source.updated_date},audit_snapshot:transactionSnapshot(e.target), ...(e.targetEntity==='JournalEntry'?{entries:e.target.entries}:['Order','PurchaseInvoice'].includes(e.targetEntity)?{source_snapshot:moduleSnapshot(e.targetEntity,e.target)}:{})},currency:company.currency,business_edition:company.edition,lines,...totals,prepared_by:ctx.user.email,prepared_by_id:ctx.user.id,rule_version:'transaction-audit-one-time-v1',evidence_note:input.reason.trim(),status:'pending'});
 return {proposal_id:proposal.id,pending_review:true,message:'One-time journal submitted for independent review. No journal has posted and no routing was changed.'};
}