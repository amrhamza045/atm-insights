import { inventoryJournal } from './inventoryAccountingRules.js';
import { requireValue } from './financeValidation.js';
export function healthInventoryEvidence(company,movements,journals,evidence){
 if(!movements.length)return {status:'missing',mapping:'Not checked: no immutable movement',reason:'No immutable actual-cost movement was captured. Check inventory activation/cutover; never reconstruct from current recipes or prices.'};
 for(const m of movements){
  if(m.status!=='applied')return {status:'unverified',mapping:'Waiting for applied evidence',reason:'Stock movement is still prepared, not applied. Reconcile operation completion without reissuing stock.'};
  const linked=journals.filter(j=>j.source_entity==='InventoryAccountingMovement'&&j.source_id===m.id);
  if(m.kind==='custody_issue'){if(!m.snapshot?.items?.length)return {status:'unverified',mapping:'Custody evidence missing',reason:'Custody movement has no immutable item-cost snapshot.'};if(linked.length)return {status:'unverified',mapping:'Custody policy review',reason:'Custody-only stock unexpectedly has a GL entry; investigate its treatment.'};continue;}
  if(m.kind==='delivery'&&m.recognition==='event_close'&&m.source_entity==='CateringCustodyCheckpoint'){if(linked.length)return {status:'unverified',mapping:'Event-close policy review',reason:'Delivered stock awaiting event close unexpectedly has a GL entry.'};continue;}
  try{
   const plan=m.snapshot?.plan||inventoryJournal(company,m,evidence.bindings);
   for(const l of plan.lines){const a=evidence.accounts.get(l.account_id);requireValue(a&&a.active&&a.posting&&a.management_mapping&&a.company_id===company.id,'Captured inventory mapping needs a valid company posting account and reporting mapping.');requireValue((!a.effective_from||m.entry_date>=a.effective_from)&&(!a.effective_to||m.entry_date<=a.effective_to),'Inventory account was not effective on the movement date.');}
   if(!plan.lines.length&&!linked.length){requireValue(Number(m.amount)===0,'An empty inventory account plan cannot certify a nonzero movement.');continue;}
   if(linked.length>1)return {status:'duplicate',mapping:'Captured account plan',reason:'More than one journal represents the same inventory movement.'};
   if(!linked.length)return {status:'missing',mapping:'Captured account plan validated',reason:'Applied inventory movement has no posted journal; review Posting Issues and inventory policy.'};
   if(JSON.stringify(linked[0].source_summary?.stock_snapshot)!==JSON.stringify(m.snapshot))return {status:'changed',mapping:'Captured account plan',reason:'Inventory movement differs from the immutable posted stock snapshot.'};
  }catch(error){if(![400,409].includes(error.status))throw error;return {status:'blocked',mapping:'Missing / invalid inventory mapping',reason:error.message};}
 }
 return {status:journals.length?'matched':'not_required',mapping:'Captured inventory policy (future routing not certified)',reason:journals.length?'All expected movement journals exist.':'Applied custody-only or explicitly zero-value movements need no GL entry under the recorded policy.'};
}