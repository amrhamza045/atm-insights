import { financeBranch, branchQuery } from './financeAccess.js';
import { requireValue, moneyUnits, validateLines } from './financeValidation.js';
import { transactionSource, transactionEligible, transactionSnapshot } from './financeTransactionSources.js';
export const transactionKey=(company,entity,id)=>entity==='JournalEntry'?`${company.id}:legacy:${id}`:['Order','PurchaseInvoice'].includes(entity)?`${company.id}:module:${entity}:${id}`:`${company.id}:transaction:${entity}:${id}`;
export async function transactionEvidence(ctx,company,entity,id){
 const def=transactionSource(entity);requireValue(typeof id==='string'&&id.length>0&&id.length<=120,'Select a transaction.');
 const source=await ctx.svc.entities[entity].get(id);financeBranch(ctx,company,source.branch_id);requireValue(transactionEligible(def,source),'Source is no longer eligible for financial recovery.',409);
 const ops=entity==='JournalEntry'?{items:[source]}:await ctx.svc.entities.JournalEntry.filter({...branchQuery(ctx,company),reference_id:id,posted:true},{limit:3});
 requireValue(!ops.has_more&&ops.items.length<=1,'Multiple operational journals reference this transaction. Reconcile duplicates before recovery.',409);
 const operational=ops.items[0],target=operational||source,targetEntity=operational?'JournalEntry':entity;
 const clauses=[{source_entity:entity,source_id:id},{'source_summary.audit_origin.entity':entity,'source_summary.audit_origin.id':id}];
 if(operational)clauses.push({source_entity:'JournalEntry',source_id:operational.id});
 if(entity==='JournalEntry'&&source.reference_id)clauses.push({source_entity:{$nin:['JournalEntry','FinanceJournal']},source_id:source.reference_id},{'source_summary.audit_origin.id':source.reference_id});
 const match={company_id:company.id,...branchQuery(ctx,company),$or:clauses};
 const [journals,proposals]=await Promise.all([ctx.svc.entities.FinanceJournal.filter({...match,status:'posted'},{limit:3}),ctx.svc.entities.FinanceProposal.filter({...match,status:'pending'},{limit:3})]);
 requireValue(!journals.has_more&&!proposals.has_more,'Too many linked financial records. Reconcile before recovery.',409);
 return {def,source,operational,target,targetEntity,key:transactionKey(company,targetEntity,target.id),journals:journals.items,proposals:proposals.items};
}
export function requireUnposted(e){requireValue(!e.journals.length,'A posted journal already represents this transaction; review it instead of posting twice.',409);requireValue(!e.proposals.length,'A source-linked proposal is pending independent review.',409);}
export async function validateTransactionProposal(ctx,company,p){
 const origin=p.source_summary.audit_origin,e=await transactionEvidence(ctx,company,origin.entity,origin.id);
 requireValue(e.targetEntity===p.source_entity&&e.target.id===p.source_id&&e.source.updated_date===origin.version&&JSON.stringify(transactionSnapshot(e.target))===JSON.stringify(p.source_summary.audit_snapshot),'Source or operational linkage changed. Reject this proposal and prepare a new preview.',409);
 requireValue(!e.journals.length&&!e.proposals.some(q=>q.id!==p.id),'This transaction has another posted journal or pending proposal.',409);
}
export async function confirmTransactionJournal(ctx,company,id){
 const journal=await ctx.svc.entities.FinanceJournal.get(id);financeBranch(ctx,company,journal.branch_id);
 requireValue(journal.company_id===company.id&&journal.status==='posted'&&journal.ledger_ready===true,'Journal posting exists but reporting preparation is incomplete. Do not create another journal.',409);
 const lines=await ctx.svc.entities.FinanceLedgerLine.filter({company_id:company.id,journal_id:id},{limit:100});
 requireValue(!lines.has_more&&lines.items.length===journal.lines.length,'Posted journal reporting lines are incomplete; repair the index, not the transaction.',409);
 const totals=validateLines(journal.lines,company.currency_decimals);
 requireValue(totals.total_debit===journal.total_debit&&totals.total_credit===journal.total_credit,'Stored journal totals do not match its lines.',409);
 requireValue(journal.lines.every((line,i)=>{const index=lines.items.find(l=>l.line_key===`${id}:${i}`);return index&&index.branch_id===journal.branch_id&&index.entry_date===journal.entry_date&&index.account_code===line.account_code&&index.debit_units===moneyUnits(line.debit,company.currency_decimals)&&index.credit_units===moneyUnits(line.credit,company.currency_decimals);}), 'Journal and reporting line values do not match; repair the index, never duplicate the journal.',409);
 return {verified:true,journal_id:id,entry_date:journal.entry_date,total_debit:journal.total_debit,total_credit:journal.total_credit,currency:journal.currency,lines:journal.lines};
}