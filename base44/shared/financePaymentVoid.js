import { requireValue, validateLines } from './financeValidation.js';
import { financeBranch } from './financeAccess.js';
import { openFinanceDate } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';

// A void reverses the immutable company posting, never today's account mappings.
export async function postPaymentVoid(ctx,company,source,{dryRun=false}={}){
 if(source.reference_type!=='catering_payment_void')return null;
 const issueKey=`${company.id}:legacy:${source.id}`;
 try{
  financeBranch(ctx,company,source.branch_id);
  const payment=await ctx.svc.entities.CateringPayment.get(source.reference_id);
  requireValue(payment.status==='voided'&&payment.branch_id===source.branch_id&&source.posted===true,'A payment reversal requires a voided payment and its posted branch journal.');
  const originals=await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,branch_id:source.branch_id,status:'posted',source_entity:'JournalEntry','source_summary.reference_id':payment.id,kind:{$ne:'reversal'}},{limit:2});
  requireValue(originals.items.length<=1,'Multiple finance originals match this payment. Reconcile them before reversal.',409);
  if(!originals.items.length)return {skipped:true,reason:'No posted company journal exists for this voided payment.'};
  const original=originals.items[0],key=`${company.id}:reverse:${original.id}`;
  const prior=await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,status:'posted',$or:[{posting_key:key},{reversal_of:original.id},{source_entity:'JournalEntry',source_id:source.id}]},{limit:2});
  requireValue(prior.items.length<=1,'Multiple reversals exist for this payment. Review before continuing.',409);
  if(prior.items.length){if(!dryRun){await projectFinanceJournal(ctx,company,prior.items[0]);await ctx.svc.entities.FinancePostingIssue.updateMany({company_id:company.id,issue_key:issueKey,status:'open'},{$set:{status:'resolved',resolved_at:new Date().toISOString()}});}return {already_posted:true,journal_id:prior.items[0].id,posting_path:'catering_payment_void'};}
  const date=String(source.entry_date||'').slice(0,10);
  requireValue(date===String(payment.voided_date||'').slice(0,10),'The reversal date differs from the payment void date.');
  openFinanceDate(company,date);
  requireValue(original.currency===company.currency,'The original journal currency differs from this company.');
  const expected=(original.source_summary.entries||[]).map(l=>({...l,debit:l.credit||0,credit:l.debit||0}));
  requireValue(expected.length>=2&&JSON.stringify(expected)===JSON.stringify(source.entries),'The operational reversal does not exactly reverse the original payment journal.');
  requireValue(!await ctx.svc.entities.FinanceProposal.count({company_id:company.id,source_key:key,status:'pending'}),'A reversal proposal is already pending for this journal.',409);
  const corrections=await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,posting_key:`${company.id}:payment-method:${original.id}`,status:'posted'},{limit:2});
  requireValue(!corrections.has_more&&corrections.items.length<=1,'Duplicate payment-method corrections require review before reversal.',409);
  const correction=corrections.items[0];
  requireValue(!correction||correction.source_entity==='FinanceJournal'&&correction.source_id===original.id&&correction.branch_id===original.branch_id&&correction.currency===original.currency&&correction.rule_version==='mapped-payment-method-correction-v1','The payment-method correction does not match this original journal.',409);
  const lines=[...original.lines,...(correction?.lines||[])].map(l=>({...l,debit:l.credit,credit:l.debit})),totals=validateLines(lines,company.currency_decimals);
  if(dryRun)return {preview:true,posting_path:'catering_payment_void',reversal_of:original.id,entry_date:date,lines,...totals};
  const journal=await ctx.svc.entities.FinanceJournal.create({company_id:company.id,branch_id:source.branch_id,proposal_id:`payment-void:${source.id}`,posting_key:key,status:'posted',entry_date:date,description:source.description,kind:'reversal',currency:original.currency,business_edition:original.business_edition,source_id:source.id,source_entity:'JournalEntry',source_version:source.updated_date,source_summary:{reference_type:source.reference_type,reference_id:payment.id,entries:source.entries,original_journal_id:original.id,payment_method_correction_id:correction?.id||'',voided_by:payment.voided_by,void_reason:payment.void_reason},reversal_of:original.id,lines,...totals,prepared_by:payment.voided_by||'Authorized payment void',prepared_by_id:'system',reviewed_by:'Validated payment void reversal',reviewed_by_id:'system',reviewed_at:new Date().toISOString(),review_note:payment.void_reason,rule_version:'catering-payment-void-v1',evidence_note:'Exact reversal of the original company journal and any approved payment-method reclassification following an authorized payment void. Original account snapshots and dimensions retained.',is_test:!!original.is_test,ledger_ready:false});
  await projectFinanceJournal(ctx,company,journal);
  await ctx.svc.entities.FinancePostingIssue.updateMany({company_id:company.id,issue_key:issueKey,status:'open'},{$set:{status:'resolved',resolved_at:new Date().toISOString()}});
  return {posted:true,journal_id:journal.id,reversal_of:original.id,posting_path:'catering_payment_void'};
 }catch(error){
  if(![400,409].includes(error.status))throw error;
  if(!dryRun)await ctx.svc.entities.FinancePostingIssue.upsert([{issue_key:issueKey,company_id:company.id,branch_id:source.branch_id,source_entity:'JournalEntry',source_id:source.id,source_description:source.description,entry_date:String(source.entry_date||'').slice(0,10),status:'open',message:error.message,last_attempt_at:new Date().toISOString(),resolved_at:''}],{key:'issue_key'});
  return {blocked:true,message:error.message,posting_path:'catering_payment_void'};
 }
}