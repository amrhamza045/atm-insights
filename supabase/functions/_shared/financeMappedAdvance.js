import { financeBranch } from './financeAccess.js';
import { requireValue, moneyUnits, validateLines } from './financeValidation.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { loadRecoveryAdvance } from './financeRecoverySource.js';
import { loadMappingBindings, resolveMappingLines } from './financeBindingResolver.js';
import { CATERING_PAYMENT_REFERENCES, mappedCateringPayment, outgoingAdvance, cateringPaymentKeys } from './financeCateringPaymentTypes.js';
export const ADVANCE_KEYS=['PAYMENT_METHOD_ACC','CUSTOMER_ADVANCE_ACC'];
export const advancePaymentSnapshot=p=>({...Object.fromEntries(['status','payment_type','credit_note','branch_id','event_id','client_id','payment_method','payment_date','amount'].map(k=>[k,p[k]??null])),...(p.payment_method_id?{payment_method_id:p.payment_method_id,payment_account_snapshot:p.payment_account_snapshot}:{})});
export const operationalSnapshot=s=>({description:s.description,reference_type:s.reference_type,reference_id:s.reference_id,entry_date:s.entry_date,entries:s.entries});
export async function mappedAdvancePlan(ctx,company,source,{correctionOf=''}={}){
 if(!CATERING_PAYMENT_REFERENCES.includes(source.reference_type)||!source.reference_id)return null;
 const p=await ctx.svc.entities.CateringPayment.get(source.reference_id);
 if(!mappedCateringPayment(p))return null;
 // A receipt voided after it posted is settled by its posted reversal; re-checks never reopen it.
 if(p.status==='voided'){const key=`${company.id}:legacy:${source.id}`,prior=(await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,status:'posted',posting_key:key},{limit:1})).items[0];if(prior&&await ctx.svc.entities.FinanceJournal.count({company_id:company.id,status:'posted',reversal_of:prior.id}))return {already_posted:true,journal:prior,key,voided:true};}
 const retained=p.payment_type==='penalty',outgoing=outgoingAdvance(p);
 const captured=p.payment_account_snapshot;
 if(captured)requireValue(captured.company_id===company.id,'The payment routing snapshot belongs to another company.',409);
 const definitions=cateringPaymentKeys(p).map(account_key=>{if(!captured)return {account_key};const a=captured.accounts?.find(a=>a.account_key===account_key);requireValue(a?.account_id,'The captured payment mapping is incomplete.');return {account_id:a.account_id,captured_key:account_key};}),bindings=await loadMappingBindings(ctx,company,definitions);
 if(!captured&&!bindings.length)return null; // Preserve historical unconfigured-company recovery.
 financeBranch(ctx,company,source.branch_id);
 requireValue(p.branch_id===source.branch_id&&source.posted===true,'The posted journal does not match the completed payment branch.');
 requireValue(company.currency==='EGP','Catering collections are recorded in EGP. Cross-currency posting requires a separate verified conversion.');
 const recovery=await loadRecoveryAdvance(ctx,company,p.id,{includeAdditional:true,includeFinalBalance:true,includeRetainedPenalty:true,includeOutgoing:true}),date=recovery.sample.date;
 requireValue(retained||typeof p.payment_method==='string'&&p.payment_method.trim(),'A recorded payment method is required for receipt or refund routing.');
 requireValue(String(source.entry_date).slice(0,10)===date,'Operational journal and payment accounting dates differ.');
 const original=validateLines(source.entries.map(l=>({...l,account_id:l.gl_account_id,cost_center:source.branch_id})),company.currency_decimals);
 requireValue(moneyUnits(original.total_debit,company.currency_decimals)===moneyUnits(p.amount,company.currency_decimals),'Operational journal amount differs from the verified payment.');
 const siblings=await ctx.svc.entities.JournalEntry.count({branch_id:source.branch_id,reference_id:p.id,posted:true});
 requireValue(siblings===1,'More than one operational journal references this payment. Reconcile duplicates before posting.',409);
 const key=`${company.id}:legacy:${source.id}`,matching={$or:[{posting_key:key},{source_entity:'CateringPayment',source_id:p.id}]};
 const prior=await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,status:'posted',...matching},{limit:2});
 requireValue(prior.items.length<=1,'This payment has multiple finance postings. Review before continuing.',409);
 if(prior.items.length){const journal=prior.items[0];requireValue(journal.source_entity==='JournalEntry'&&journal.source_id===source.id&&journal.branch_id===source.branch_id&&journal.entry_date===date&&JSON.stringify(journal.source_summary.entries)===JSON.stringify(source.entries),'This payment already has a different finance posting. Use reviewed reversals, never a duplicate.',409);if(journal.source_summary.mapped_payment)requireValue(JSON.stringify(journal.source_summary.mapped_payment)===JSON.stringify(advancePaymentSnapshot(p)),'Payment details changed after posting. Reconcile with a reviewed correction.',409);if(!correctionOf)return {already_posted:true,journal,key,retained};}
 requireValue(!correctionOf||prior.items[0]?.id===correctionOf,'The correction must reference the existing original posting.',409);
 openFinanceDate(company,date);
 requireValue(!await ctx.svc.entities.FinanceProposal.count({company_id:company.id,status:'pending',$or:[{source_key:key},{source_entity:'CateringPayment',source_id:p.id}]}),'This payment has a pending financial proposal; resolve it before automatic posting.',409);
 const sample={...recovery.sample,dimensions:{...recovery.sample.dimensions,cost_center:p.event_id}},resolved=await resolveMappingLines(ctx,company,definitions,sample,bindings);
 const raw=resolved.map((l,i)=>({account_id:l.account_id,debit:i===0?p.amount:0,credit:i===1?p.amount:0,cost_center:p.event_id,channel:'catering',product_reference:p.event_id,counterparty_reference:p.client_id}));
 const lines=await checkedAccounts(ctx,company,raw,date);
 requireValue(retained?lines[0].account_code.startsWith('2')&&lines[1].account_code.startsWith('4'):outgoing?lines[0].account_code.startsWith('2')&&lines[1].account_code.startsWith('1'):lines[0].account_code.startsWith('1')&&lines[1].account_code.startsWith('2'),retained?'Retained cancellation advances require a liability debit and a revenue credit.':outgoing?'Refund mapping must debit customer advances and credit the payment-method asset.':'Receipt mapping must be an asset and customer advances must be a liability.');
 return {key,date,lines,retained,outgoing,...validateLines(lines,company.currency_decimals),source_summary:{...operationalSnapshot(source),mapped_payment:advancePaymentSnapshot(p),mapping_event:retained?'cancellation_advance_retained':outgoing?'catering_advance_refund':'B05',mapping_bindings:resolved.map(l=>({key:l.account_key||l.captured_key,binding_id:l.binding_id||p.payment_method_id,binding_updated_date:l.binding_updated_date||captured?.method_updated_date})),sample},payment_id:p.id};
}