import { financePermission, financeBranch } from './financeAccess.js';
import { requireValue, validateLines } from './financeValidation.js';
import { mappedAdvancePlan } from './financeMappedAdvance.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';
import { confirmTransactionJournal } from './financeTransactionEvidence.js';

// Deterministic asset-only correction of an old generic refund posting.
// No caller-chosen accounts, amounts, liability changes or replacement of history.
export async function correctPaymentMethod(ctx,company,input){
 financePermission(ctx,'finance_journal_approve');
 requireValue(ctx.admin,'An administrator must authorize this legacy payment-method correction.',403);
 requireValue(input.dry_run===true||input.confirmed===true,'Confirm the payment-method accounting correction.');
 requireValue(typeof input.reason==='string'&&input.reason.trim().length>=10&&input.reason.length<=2000,'Explain the approved accounting correction.');
 requireValue(typeof input.journal_id==='string'&&input.journal_id,'Select the original posted journal.');
 const original=await ctx.svc.entities.FinanceJournal.get(input.journal_id);
 requireValue(original.company_id===company.id&&original.status==='posted'&&original.currency===company.currency&&original.source_entity==='JournalEntry'&&original.rule_version==='automatic-operational-v1','Select an original generic automatic posting in this company.',409);
 financeBranch(ctx,company,original.branch_id);
 requireValue(!await ctx.svc.entities.FinanceJournal.count({company_id:company.id,status:'posted',reversal_of:original.id}),'The original journal has been reversed; reconcile it separately.',409);
 const source=await ctx.svc.entities.JournalEntry.get(original.source_id),plan=await mappedAdvancePlan(ctx,company,source,{correctionOf:original.id});
 requireValue(plan?.outgoing&&plan.payment_id===original.source_summary?.reference_id,'Only a verified completed refund or deposit withdrawal can use this correction.',409);
 const key=`${company.id}:payment-method:${original.id}`,prior=await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,posting_key:key,status:'posted'},{limit:2});
 requireValue(!prior.has_more&&prior.items.length<=1,'Duplicate payment-method corrections require investigation.',409);
 if(prior.items.length){
  const journal=prior.items[0];requireValue(JSON.stringify(journal.source_summary.mapped_payment)===JSON.stringify(plan.source_summary.mapped_payment),'Payment details changed after correction; review without duplicating it.',409);
  if(input.dry_run===true)return {already_posted:true,preview:true,journal_id:journal.id,lines:journal.lines};
  await projectFinanceJournal(ctx,company,journal);return {...await confirmTransactionJournal(ctx,company,journal.id),already_posted:true};
 }
 requireValue(!await ctx.svc.entities.FinanceProposal.count({company_id:company.id,status:'pending',$or:[{source_key:key},{source_entity:'FinanceJournal',source_id:original.id}]}),'Resolve the pending correction or reversal proposal first.',409);
 requireValue(original.lines.length===2&&plan.lines.length===2,'This correction requires the original two-line advance refund.',409);
 const [liability,asset]=original.lines,[expectedLiability,expectedAsset]=plan.lines;
 requireValue(liability.account_id===expectedLiability.account_id&&liability.debit===expectedLiability.debit&&liability.credit===0&&asset.debit===0&&asset.credit===expectedAsset.credit&&asset.account_code.startsWith('1'),'Liability, source amount or asset treatment differs; use independent accounting review.',409);
 if(asset.account_id===expectedAsset.account_id)return {unchanged:true,message:'The payment-method asset is already correct.'};
 openFinanceDate(company,original.entry_date);
 const raw=[{...asset,debit:asset.credit,credit:0},{...asset,account_id:expectedAsset.account_id,debit:0,credit:asset.credit}],lines=await checkedAccounts(ctx,company,raw,original.entry_date),totals=validateLines(lines,company.currency_decimals);
 if(input.dry_run===true)return {preview:true,original_journal_id:original.id,payment_id:plan.payment_id,payment_method:plan.source_summary.mapped_payment.payment_method,entry_date:original.entry_date,currency:company.currency,lines,...totals};
 const journal=await ctx.svc.entities.FinanceJournal.create({company_id:company.id,branch_id:original.branch_id,proposal_id:`payment-method:${original.id}`,posting_key:key,status:'posted',entry_date:original.entry_date,description:`Payment-method correction: ${original.description}`,kind:'automatic',currency:company.currency,business_edition:company.edition,source_entity:'FinanceJournal',source_id:original.id,source_version:original.updated_date,source_summary:{original_journal_id:original.id,original_source_id:source.id,reference_type:'catering_payment_method_correction',reference_id:plan.payment_id,mapped_payment:plan.source_summary.mapped_payment,mapping_bindings:plan.source_summary.mapping_bindings},lines,...totals,prepared_by:ctx.user.email,prepared_by_id:ctx.user.id,reviewed_by:ctx.user.email,reviewed_by_id:ctx.user.id,reviewed_at:new Date().toISOString(),review_note:input.reason.trim(),rule_version:'mapped-payment-method-correction-v1',evidence_note:'Authorized deterministic reclassification from the original credited asset to the dated PAYMENT_METHOD_ACC binding for the recorded refund method. Original posting, customer-advance liability, payment and event balances are unchanged.',is_test:!!original.is_test,ledger_ready:false});
 await projectFinanceJournal(ctx,company,journal);
 return {...await confirmTransactionJournal(ctx,company,journal.id),corrected:true,original_journal_id:original.id,payment_id:plan.payment_id};
}