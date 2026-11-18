import { requireValue, validDate, validateLines } from './financeValidation.js';
import { financeBranch, financePermission } from './financeAccess.js';
import { projectFinanceJournal } from './financeLedger.js';
import { noLinkedLegacy, noModuleDuplicate } from './financeModuleRules.js';
import { validateTransactionProposal, confirmTransactionJournal } from './financeTransactionEvidence.js';
import { holdsSelfApprovalBypass, auditSelfApproval } from './selfApprovalBypass.js';
import { OPERATIONAL_RULE, validateOperationalProposal, applyOperationalEffects } from './financeOperationalReview.js';
export function openFinanceDate(company,date) {
 requireValue(validDate(date),'A valid accounting date is required.');
 requireValue(!company.closed_through||date>company.closed_through,`Posting is locked through ${company.closed_through}.`);
}
export async function checkedAccounts(ctx,company,lines,date) {
 const ids=[...new Set(lines.map(l=>l.account_id))];
 const {items}=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:ids}},{limit:100});
 const map=new Map(items.map(a=>[a.id,a]));
 return lines.map(line=>{
  const a=map.get(line.account_id);
  requireValue(a&&a.active&&a.posting,'Every line needs an active posting account in this company.');
  requireValue((!a.effective_from||date>=a.effective_from)&&(!a.effective_to||date<=a.effective_to),`Account ${a.code} is not effective on the accounting date.`);
  requireValue(a.management_mapping,`Account ${a.code} needs a reporting mapping.`);
  const clean={account_id:a.id,account_code:a.code,account_name:a.name,management_mapping:a.management_mapping,statutory_mapping:a.statutory_mapping||'',debit:Number(line.debit),credit:Number(line.credit)};
  for(const key of ['cost_center','channel','product_category','product_reference','counterparty_reference']) clean[key]=String(line[key]||'').trim().slice(0,200);
  return clean;
 });
}
export async function prepareFinanceProposal(ctx,company,data) {
 financePermission(ctx,data.kind==='historical'?'finance_reconstruct':'finance_journal_create');
 requireValue(['manual','opening','historical','reversal'].includes(data.kind),'Unsupported journal kind.');
 requireValue(typeof data.description==='string'&&data.description.trim(),'A description is required.');
 requireValue(typeof data.evidence_note==='string'&&data.evidence_note.trim(),'Explain the supporting evidence and accounting treatment.');
 if(['manual','opening'].includes(data.kind)) requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.request_key||''),'A valid submission identifier is required.');
 let branch=data.branch_id, date=data.entry_date, lines=data.lines, source_id='',source_entity='',source_version='',source_summary={},source_key=`${company.id}:manual:${data.request_key}`;
 if(data.kind==='historical') {
  const source=await ctx.svc.entities.JournalEntry.get(data.source_id);
  requireValue(source?.posted&&Array.isArray(source.entries),'Select a posted legacy journal.');
  await noModuleDuplicate(ctx,company,source);
  branch=source.branch_id; date=source.entry_date.slice(0,10); source_id=source.id;source_entity='JournalEntry';source_version=source.updated_date;
  source_key=`${company.id}:legacy:${source.id}`;
  source_summary={description:source.description,reference_type:source.reference_type,reference_id:source.reference_id,entry_date:source.entry_date,entries:source.entries};
  requireValue(lines?.length===source.entries.length,'Map every original journal line.');
  lines=lines.map((line,i)=>({...line,debit:source.entries[i].debit||0,credit:source.entries[i].credit||0}));
 }
 if(data.kind==='reversal') {
  const source=await ctx.svc.entities.FinanceJournal.get(data.source_id);
  requireValue(source?.company_id===company.id&&source.status==='posted','Select a posted journal in this company.');
  branch=source.branch_id;source_id=source.id;source_entity='FinanceJournal';source_version=source.updated_date;source_key=`${company.id}:reverse:${source.id}`;
  lines=source.lines.map(line=>({...line,debit:line.credit,credit:line.debit}));source_summary={description:source.description,entry_date:source.entry_date};
 }
 financeBranch(ctx,company,branch);openFinanceDate(company,date);
 requireValue(!await ctx.svc.entities.FinanceJournal.count({company_id:company.id,posting_key:source_key,status:'posted'}),'This source has already been posted.',409);
 const totals=validateLines(lines,company.currency_decimals);
 lines=await checkedAccounts(ctx,company,lines,date);
 if(['manual','opening'].includes(data.kind)) {
  const prior=await ctx.svc.entities.FinanceProposal.filter({company_id:company.id,source_key},{limit:1});
  if(prior.items.length){const p=prior.items[0];requireValue(p.prepared_by_id===ctx.user.id&&p.kind===data.kind&&p.branch_id===branch&&p.entry_date===date&&p.description===data.description.trim()&&p.evidence_note===data.evidence_note.trim()&&p.lines.length===lines.length&&lines.every((line,i)=>Object.entries(line).every(([key,value])=>p.lines[i][key]===value)),'This submission was already saved with different details. Open its review entry or prepare a new proposal.',409);return {proposal:p,already_prepared:true};}
 }
 return {proposal:await ctx.svc.entities.FinanceProposal.create({company_id:company.id,branch_id:branch,entry_date:date,description:data.description.trim(),kind:data.kind,source_key,source_id,source_entity,source_version,source_summary,currency:company.currency,business_edition:company.edition,lines,...totals,prepared_by:ctx.user.email,prepared_by_id:ctx.user.id,rule_version:'finance-foundation-v1',evidence_note:data.evidence_note.trim(),status:'pending'})};
}
export async function decideFinanceProposal(ctx,company,data) {
 financePermission(ctx,'finance_journal_approve');
 const p=await ctx.svc.entities.FinanceProposal.get(data.proposal_id);
 requireValue(p?.company_id===company.id,'Proposal not found in this company.',404);financeBranch(ctx,company,p.branch_id);
 const prior=await ctx.svc.entities.FinanceJournal.filter({proposal_id:p.id,company_id:company.id},{limit:1});
 if(prior.items.length){await projectFinanceJournal(ctx,company,prior.items[0]);await ctx.svc.entities.FinanceProposal.update(p.id,{status:prior.items[0].status,decision_id:prior.items[0].id});return {journal:prior.items[0],already_decided:true};}
 const selfReview=p.prepared_by_id===ctx.user.id;
 requireValue(!selfReview||await holdsSelfApprovalBypass(ctx.svc,ctx.user),'A different authorized person must review this proposal. To post your own, your role needs Self-approve (skip second approver).',403);
 requireValue(['posted','rejected'].includes(data.decision),'Choose approve or reject.');
 requireValue(typeof data.note==='string'&&data.note.trim(),'A review note is required.');
 if(data.decision==='posted') {
  openFinanceDate(company,p.entry_date);validateLines(p.lines,company.currency_decimals);
  const current=await checkedAccounts(ctx,company,p.lines,p.entry_date);
  requireValue(current.every((l,i)=>l.management_mapping===p.lines[i].management_mapping&&l.statutory_mapping===p.lines[i].statutory_mapping),'Reporting mappings changed; reject and prepare a fresh proposal.');
  requireValue(!await ctx.svc.entities.FinanceJournal.count({company_id:company.id,posting_key:p.source_key,status:'posted'}),'This source has already been posted.',409);
  if(p.rule_version==='transaction-audit-one-time-v1') await validateTransactionProposal(ctx,company,p);
  else if(p.rule_version===OPERATIONAL_RULE) await validateOperationalProposal(ctx,company,p);
  else if(p.kind==='historical') {
   const entity=p.source_entity||'JournalEntry';requireValue(['JournalEntry','Order','PurchaseInvoice'].includes(entity),'Unsupported historical source.');
   const source=await ctx.svc.entities[entity].get(p.source_id);
   requireValue(source?.updated_date===p.source_version&&(entity==='JournalEntry'?source.posted:entity==='Order'?['paid','completed'].includes(source.status):source.status==='posted'),'Original source changed; reject and prepare a fresh proposal.');
   if(entity!=='JournalEntry')await noLinkedLegacy(ctx,company,source);else await noModuleDuplicate(ctx,company,source);
  }
 }
 const {id,created_date,updated_date,created_by_id,created_by,status,decision_id,source_key,...snapshot}=p;
 const journal=await ctx.svc.entities.FinanceJournal.create({...snapshot,proposal_id:p.id,posting_key:data.decision==='posted'?p.source_key:`reject:${p.id}`,status:data.decision,reviewed_by:ctx.user.email,reviewed_by_id:ctx.user.id,reviewed_at:new Date().toISOString(),review_note:data.note.trim(),reversal_of:p.kind==='reversal'?p.source_id:'',is_test:!!company.is_test});
 await ctx.svc.entities.FinanceProposal.update(p.id,{status:data.decision,decision_id:journal.id});
   await projectFinanceJournal(ctx,company,journal);
   if(journal.status==='posted'&&p.rule_version===OPERATIONAL_RULE)await applyOperationalEffects(ctx,company,{...p,decision_id:journal.id});
   if(selfReview&&journal.status==='posted')await auditSelfApproval(ctx.svc,ctx.user,'FinanceJournal',journal.id,`${p.kind} journal "${p.description}"`);
   return {journal,...(journal.status==='posted'&&p.rule_version==='transaction-audit-one-time-v1'?await confirmTransactionJournal(ctx,company,journal.id):{})};
}