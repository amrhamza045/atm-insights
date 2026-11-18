import { requireValue } from './financeValidation.js';
import { postInventoryMovement } from './inventoryAccountingPosting.js';
import { captureDeliveryInventory } from './inventoryDeliveryCapture.js';
import { captureEventCogs } from './inventoryEventCogs.js';
import { settleEventTastings } from './inventoryWastePosting.js';
export async function postInventorySource(ctx,company,entity,source) {
 const db=ctx.svc.entities;let movements=[],tastings;
 if(entity==='InventoryAccountingMovement'){
  if(source.status==='prepared'&&['ProductionOrder','KitchenReleaseSlip'].includes(source.source_entity)){
   const operation=await db[source.source_entity].get(source.source_id);
   if(source.source_entity==='ProductionOrder'&&operation.status==='completed'||source.source_entity==='KitchenReleaseSlip'&&operation.status==='released'){await db.InventoryAccountingMovement.update(source.id,{status:'applied'});source.status='applied';}
  }
  movements=[source];
 }
 else if(entity==='CateringEvent'){
  // Tastings follow every outcome (closed, cancelled, reinstated); COGS only once the event is closed.
  tastings=await settleEventTastings(ctx,company,source);
  if(source.status!=='completed')return {tastings,skipped:true,reason:'Event is not closed; only its tastings were settled.'};
  const m=await captureEventCogs(ctx,company,source);if(!m)return {tastings,skipped:true,reason:'Nothing consumed to recognize for this event.'};movements=[m];
 }
 else if(entity==='CateringCustodyCheckpoint'){if(source.stage!=='delivered')return {skipped:true};movements=await captureDeliveryInventory(ctx,company,source);}
 else {
  const page=await db.InventoryAccountingMovement.filter({company_id:company.id,source_entity:entity,source_id:source.id},{limit:100});requireValue(!page.has_more,'Too many stock movements for one source.');movements=page.items;
  if(entity==='ProductionOrder'&&source.status==='completed'||entity==='KitchenReleaseSlip'&&source.status==='released')for(const m of movements)if(m.status==='prepared'){await db.InventoryAccountingMovement.update(m.id,{status:'applied'});m.status='applied';}
  if(!movements.length){if(entity==='Order'&&source.created_date?.slice(0,10)>=company.module_policy.inventory.from)requireValue(false,'This sale has no immutable stock issue evidence. Reconcile it; costs will not be inferred from current recipes or prices.');return {skipped:true,reason:'No captured inventory evidence; historical stock is not reconstructed automatically.'};}
 }
 const results=[];for(const m of movements)results.push(await postInventoryMovement(ctx,company,m));
 if(results.every(r=>!r.blocked&&!r.waiting))await db.FinancePostingIssue.updateMany({company_id:company.id,issue_key:`${company.id}:inventory-source:${entity}:${source.id}`,status:'open'},{$set:{status:'resolved',resolved_at:new Date().toISOString()}});
 return {results,...(tastings?{tastings}:{}),retry:results.some(r=>r.retry)};
}