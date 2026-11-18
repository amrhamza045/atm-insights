import { requireValue, validateLines } from './financeValidation.js';
import { financeBranch } from './financeAccess.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { projectFinanceJournal } from './financeLedger.js';
import { inventoryJournal, INVENTORY_KEYS, inventorySnapshotKey } from './inventoryAccountingRules.js';
import { loadMappingBindings } from './financeBindingResolver.js';
import { inventoryDate } from './inventoryAccountingContext.js';
import { inventoryItemStages } from './inventoryItemStages.js';
import { describeMissingMapping } from './inventoryMappingMessages.js';
export async function inventoryPlan(ctx,company,movement) {
 const bindings=await loadMappingBindings(ctx,company,INVENTORY_KEYS.map(account_key=>({account_key})));
 const s=movement.snapshot,production=movement.kind==='production';
 const items=production?[...(s.inputs||[]),...(s.output?[s.output]:[])]:s.items||[];
 const typed=await inventoryItemStages(ctx.svc.entities,bindings,items,{date:movement.entry_date,dimensions:{branch_id:movement.branch_id,currency:company.currency}});
 if(production){s.inputs=typed.slice(0,(s.inputs||[]).length);if(s.output)s.output=typed[typed.length-1];}else s.items=typed;
 let plan;try{plan=inventoryJournal(company,movement,bindings);}catch(error){throw await describeMissingMapping(ctx.svc.entities,error);}
 const lines=await checkedAccounts(ctx,company,plan.lines,movement.entry_date);
 const accounts=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:lines.map(l=>l.account_id)}},{limit:100});
 requireValue(lines.every(line=>accounts.items.find(a=>a.id===line.account_id)?.classification===(movement.kind==='production'||line.credit>0?'assets':'cogs')),'Inventory assets and COGS must use their respective account classifications.');
 return {...plan,lines};
}
export async function postInventoryMovement(ctx,company,m) {
 financeBranch(ctx,company,m.branch_id);requireValue(m.company_id===company.id,'Stock evidence belongs to another company.',403);
 const key=inventorySnapshotKey(company,'journal',m.id),db=ctx.svc.entities;
 try {
  requireValue(m.status==='applied','Prepared stock movement has not finished. Reconcile its source operation before posting; stock is never reissued automatically.',409);
  if(m.kind==='custody_issue')return {warehouse_transfer:true,reason:'Stock remains in its category asset account while in event custody.'};
  // Delivered stock stays in inventory until the event closes; event close nets returns and posts COGS.
  if(m.kind==='delivery'&&m.recognition==='event_close'&&m.source_entity==='CateringCustodyCheckpoint')return {deferred:true,reason:'COGS is recognized when the event is closed.'};
  if(m.source_entity==='CateringEvent'&&(await db.CateringEvent.get(m.source_id)).status!=='completed')return {waiting:true,reason:'Waiting for the event to close.'};
  let date=m.entry_date;
  if(m.kind==='sale') {
   const order=await db.Order.get(m.source_id);
   requireValue(JSON.stringify(order.items)===m.snapshot.source_items,'Sale lines changed after stock issue; reconcile the stock movement.',409);
   requireValue(order.status!=='cancelled','Cancelled stock issue needs a reviewed inventory reversal.',409);
   if(m.recognition==='delivery'&&order.order_type==='delivery'){
    if(order.delivery_status!=='delivered')return {waiting:true,reason:'Waiting for confirmed delivery.'};
    date=await inventoryDate(db,order.delivery_delivered_at);
   }else if(!['paid','completed'].includes(order.status))return {waiting:true,reason:'Waiting for sale confirmation.'};
  }
  const prior=await db.FinanceJournal.filter({company_id:company.id,posting_key:key,status:'posted'},{limit:1});
  if(prior.items.length){await projectFinanceJournal(ctx,company,prior.items[0]);await db.InventoryAccountingMovement.update(m.id,{journal_id:prior.items[0].id});return {already_posted:true,journal_id:prior.items[0].id};}
  // A movement captured before its routing existed resolves it now, without touching the stored snapshot.
  const plan=m.snapshot.plan||await inventoryPlan(ctx,company,{...m,snapshot:structuredClone(m.snapshot)});
  if(!plan.lines.length)return {zero_value:true};
  openFinanceDate(company,date);const lines=await checkedAccounts(ctx,company,plan.lines,date),totals=validateLines(lines,company.currency_decimals);
  const journal=await db.FinanceJournal.create({company_id:company.id,branch_id:m.branch_id,posting_key:key,proposal_id:`inventory:${m.id}`,status:'posted',entry_date:date,description:m.description||`Inventory ${m.kind} · ${m.source_id}`,kind:'automatic',currency:company.currency,business_edition:company.edition,source_entity:'InventoryAccountingMovement',source_id:m.id,source_version:m.updated_date,source_summary:{movement_key:m.movement_key,source_entity:m.source_entity,source_id:m.source_id,mapping_bindings:plan.mapping_bindings,stock_snapshot:m.snapshot},lines,...totals,prepared_by:'Inventory actual-cost engine',prepared_by_id:'system',reviewed_by:'Configured inventory policy',reviewed_by_id:'system',reviewed_at:new Date().toISOString(),review_note:'Actual operational cost; no sales-price or quote-cost inference.',rule_version:'inventory-lifecycle-v1',evidence_note:'Immutable stock movement and dated category mappings.',is_test:!!company.is_test,ledger_ready:false});
  await projectFinanceJournal(ctx,company,journal);await db.InventoryAccountingMovement.update(m.id,{journal_id:journal.id});
  await db.FinancePostingIssue.updateMany({company_id:company.id,source_entity:'InventoryAccountingMovement',source_id:m.id,status:'open'},{$set:{status:'resolved',resolved_at:new Date().toISOString()}});
  return {posted:true,journal_id:journal.id};
 }catch(error){if(![400,409].includes(error.status))throw error;await db.FinancePostingIssue.upsert([{issue_key:key,company_id:company.id,branch_id:m.branch_id,source_entity:'InventoryAccountingMovement',source_id:m.id,source_description:`Inventory ${m.kind}`,entry_date:m.entry_date,status:'open',message:error.message,last_attempt_at:new Date().toISOString()}],{key:'issue_key'});return {blocked:true,message:error.message,retry:error.status===409};}
}