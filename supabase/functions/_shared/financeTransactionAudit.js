import { branchQuery, financeBranch } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { TRANSACTION_SOURCES, transactionSource, transactionRange, transactionDate, transactionAmount, transactionSuggestion } from './financeTransactionSources.js';
import { transactionEvidence } from './financeTransactionEvidence.js';
import { previewTransactionRecovery } from './financeTransactionPreview.js';
import { auditDiagnosticContext, currentAuditBlocker } from './financeTransactionDiagnostics.js';
import { transactionPresentation } from './financeTransactionPresentation.js';
import { CATERING_PAYMENT_REFERENCES, mappedCateringPayment, cateringPaymentKeys } from './financeCateringPaymentTypes.js';
import { AUDIT_PAYMENT_CONDITIONS, auditPaymentContext } from './financeAuditConditions.js';
import { auditMappingState, auditQueueMatches } from './financeAuditMapping.js';
import { PURCHASE_KEYS } from './financeMappedPurchase.js';
import { auditPurchaseOrders } from './financeAuditPurchaseOrders.js';
import { inventorySuggestion } from './financeAuditInventory.js';
export async function listTransactionAudit(ctx,company,input){
 const defs=input.source_entity?[transactionSource(input.source_entity)]:TRANSACTION_SOURCES;
 let cursor={index:0};if(input.cursor){requireValue(typeof input.cursor==='string'&&input.cursor.length<3000,'Invalid audit cursor.');cursor=JSON.parse(input.cursor);}
 requireValue(Number.isInteger(cursor.index)&&cursor.index>=0&&cursor.index<defs.length,'Invalid audit source cursor.');
 requireValue(!input.status||['missing','pending','posted','all'].includes(input.status),'Invalid audit status.');
 requireValue(!input.mapping_status||['all','exceptions','needs_mapping','ready'].includes(input.mapping_status),'Invalid mapping status.');
 const def=defs[cursor.index],branches=branchQuery(ctx,company),range=transactionRange(input);if(input.branch_id){financeBranch(ctx,company,input.branch_id);branches.branch_id=input.branch_id;}
 const page=await ctx.svc.entities[def.entity].filter({...branches,...def.query,...(Object.keys(range).length?{[def.date]:range}:{})},{sort:`-${def.date}`,limit:25,...(cursor.next?{cursor:cursor.next}:{})});
 const ids=page.items.map(s=>s.id),ops=def.entity==='JournalEntry'?{items:page.items}:ids.length?await ctx.svc.entities.JournalEntry.filter({...branches,reference_id:{$in:ids},posted:true},{limit:250}):{items:[]};
 requireValue(!ops.has_more,'Too many linked operational journals; narrow the audit range.');
 const opIds=ops.items.map(s=>s.id),refs=def.entity==='JournalEntry'?page.items.map(s=>s.reference_id).filter(Boolean):[];
 const clauses=[{source_entity:def.entity,source_id:{$in:ids}},{source_entity:'JournalEntry',source_id:{$in:opIds}},{'source_summary.audit_origin.entity':def.entity,'source_summary.audit_origin.id':{$in:ids}}];
 if(refs.length)clauses.push({source_entity:{$nin:['JournalEntry','FinanceJournal']},source_id:{$in:refs}},{'source_summary.audit_origin.id':{$in:refs}});
 const scope={company_id:company.id,...branches,$or:clauses};
 const [journals,proposals,issues]=ids.length?await Promise.all([ctx.svc.entities.FinanceJournal.filter({...scope,status:'posted'},{limit:250}),ctx.svc.entities.FinanceProposal.filter({...scope,status:'pending'},{limit:250}),ctx.svc.entities.FinancePostingIssue.filter({company_id:company.id,...branches,source_id:{$in:[...ids,...opIds]},status:'open'},{limit:250,sort:'-last_attempt_at'})]):[{items:[]},{items:[]},{items:[]}];
 requireValue(!journals.has_more&&!proposals.has_more&&!issues.has_more,'Too many financial links; narrow the audit filters.');
 const [diagnostic,purchaseOrders]=await Promise.all([auditDiagnosticContext(ctx,company,def,page.items,ops.items),auditPurchaseOrders(ctx,def,page.items,branches)]);
 const items=page.items.map(s=>{
  const linked=ops.items.filter(o=>def.entity==='JournalEntry'?o.id===s.id:o.reference_id===s.id),opSet=new Set(linked.map(o=>o.id));
  const matches=j=>j.source_entity===def.entity&&j.source_id===s.id||j.source_entity==='JournalEntry'&&opSet.has(j.source_id)||j.source_summary?.audit_origin?.entity===def.entity&&j.source_summary.audit_origin.id===s.id||def.entity==='JournalEntry'&&s.reference_id&&(j.source_entity!=='JournalEntry'&&j.source_entity!=='FinanceJournal'&&j.source_id===s.reference_id||j.source_summary?.audit_origin?.id===s.reference_id);
  const posted=journals.items.filter(matches),pending=proposals.items.filter(matches),issue=issues.items.find(i=>i.source_id===s.id||opSet.has(i.source_id));
  const status=posted.length?'posted':pending.length?'pending':'missing';
  // A tasting carries its holding journal plus settlement moves; only repeated originals are duplicates.
  const primary=posted.filter(j=>!/:tasting-settle:/.test(j.posting_key||''));
  const reason=primary.length>1?'Multiple posted journals matched; investigate duplicate accounting.':posted.length?posted.every(j=>j.ledger_ready)?(posted.length>primary.length?'Posted; the tasting cost was moved to match the event outcome.':'Posted company journal found.'):'Posted journal exists, but its reporting index is incomplete.':pending.length?'A source-linked proposal is pending independent review.':issue?.message||`No saved skip reason; current check: ${currentAuditBlocker(company,def,s,linked,diagnostic)}`;
  return {...transactionPresentation(def,s,linked,posted),id:s.id,source_entity:def.entity,source_name:def.name,date:transactionDate(def,s),amount:transactionAmount(def,s),description:s.description||s.event_name||s.invoice_number||s.reference||(s.inventory_item_name&&[s.inventory_item_name,s.waste_reason_name].filter(Boolean).join(' · '))||s.id,branch_id:s.branch_id,purchase_orders:purchaseOrders.get(s.id)||[],status,mapping:auditMappingState(company,def,s,linked,diagnostic),reason,reason_evidence:issue?'Recorded posting failure':'Current source and ledger evidence',suggestion:def.inventory?inventorySuggestion(reason):transactionSuggestion(reason),journal_ids:posted.map(j=>j.id),proposal_ids:pending.map(p=>p.id)};
 }).filter(s=>auditQueueMatches(s,input));
 const next=page.has_more?{index:cursor.index,next:page.next_cursor}:{index:cursor.index+1};
 const has_more=page.has_more||next.index<defs.length;
 return {items,has_more,next_cursor:has_more?JSON.stringify(next):null,scanned:page.items.length,source_name:def.name,sources:TRANSACTION_SOURCES.map(({entity,name,live})=>({entity,name,live:!!live}))};
}
export async function inspectTransactionAudit(ctx,company,input){
 const e=await transactionEvidence(ctx,company,input.source_entity,input.source_id);let preview=null,reason='';
 if(e.journals.length)reason='A posted journal already exists. Do not create another entry.';
 else if(e.proposals.length)reason='A source-linked proposal is pending independent review.';
 else try{preview=await previewTransactionRecovery(ctx,company,input);reason='Current routing validates. Preview and explicitly confirm to recover this transaction.';}catch(error){if(![400,409].includes(error.status))throw error;reason=error.message;}
 let payment=e.def.entity==='CateringPayment'?e.source:null;
 if(!payment&&CATERING_PAYMENT_REFERENCES.includes(e.operational?.reference_type))payment=await ctx.svc.entities.CateringPayment.get(e.operational.reference_id);
 const semantic=mappedCateringPayment(payment);
 if(payment?.payment_account_snapshot)reason+=' This payment retains its captured accounts; changing Payment methods affects new payments only.';
 const routing=semantic?{kind:'semantic',keys:cateringPaymentKeys(payment),payment_method:payment.payment_method,condition_fields:AUDIT_PAYMENT_CONDITIONS,context:auditPaymentContext(company,payment),labels:{branch_id:payment.branch_name||payment.branch_id,customer_id:payment.client_name||payment.client_id,event_id:payment.event_name||payment.event_id}}:e.operational?{kind:'operational',accounts:(e.operational.entries||[]).map(l=>({id:l.gl_account_id,code:l.account_number,name:l.account_name}))}:e.targetEntity==='PurchaseInvoice'?{kind:'purchase',keys:company.module_policy?.inventory?.enabled?['INVENTORY_CONTROL_ACCOUNT','VENDOR_AP_ACCOUNT']:PURCHASE_KEYS,condition_fields:['branch_id','currency','category']}:e.targetEntity==='Order'?{kind:'module'}:e.def.inventory?{kind:'inventory'}:{kind:'unsupported'};
 if(semantic&&(ctx.admin||!ctx.permissions.branch_id)){
  const bindings=await ctx.svc.entities.FinanceAccountBinding.filter({company_id:company.id,mapping_key:{$in:routing.keys}},{limit:500});
  requireValue(!bindings.has_more,'Too many account bindings to inspect safely. Narrow the account routing.');routing.bindings=bindings.items;
 }
 const diagnostic=await auditDiagnosticContext(ctx,company,e.def,[e.source],e.operational?[e.operational]:[]);
 const mapping=auditMappingState(company,e.def,e.source,e.operational?[e.operational]:[],diagnostic);
 return {mapping,reason,suggestion:e.def.inventory?inventorySuggestion(reason):transactionSuggestion(reason),preview,routing,source_version:e.source.updated_date,target_version:e.target.updated_date,source_id:e.source.id,source_entity:e.def.entity,source_name:e.def.name,amount:transactionAmount(e.def,e.source),source_date:transactionDate(e.def,e.source),branch_id:e.source.branch_id,target_id:e.target.id,journals:e.journals.map(j=>({id:j.id,status:j.status,ledger_ready:j.ledger_ready})),proposals:e.proposals.map(p=>({id:p.id,status:p.status})),initial_lines:e.operational?e.operational.entries.map(l=>({debit:l.debit||0,credit:l.credit||0,cost_center:e.source.branch_id})):null};
}