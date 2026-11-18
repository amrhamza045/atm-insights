import { requireValue } from './financeValidation.js';
import { withFinanceLock } from './financeAccess.js';
import { inventoryOwner,inventoryDate,inventoryRecord } from './inventoryAccountingContext.js';
import { inventoryPolicy,inventorySnapshotKey } from './inventoryAccountingRules.js';
import { inventoryPlan } from './inventoryAccountingPosting.js';
import { computeIngredientCost,getItemStockUnit } from './unitConversion.js';
export async function prepareCustodyInventory(base44,user,{event,slip,moves,itemsById,rules}) {
 const company=await inventoryOwner(base44.asServiceRole.entities,event.branch_id);if(!company)return [];
 const occurred_at=new Date().toISOString(),entry_date=await inventoryDate(base44.asServiceRole.entities,occurred_at);if(entry_date<inventoryPolicy(company).from)return [];
 const ctx={base44,svc:base44.asServiceRole,user,admin:true,permissions:{}};
 return withFinanceLock(ctx,company,async fresh=>{
  if(!inventoryPolicy(fresh).enabled)return [];
  const records=[];for(const move of moves){if(move.actualInStock<=0||(move.line.purpose||move.reservation.purpose)==='production_input')continue;
   const item=itemsById.get(move.line.inventory_item_id),key=inventorySnapshotKey(fresh,'custody_issue',`${slip.id}:${move.reservation.id}`);
   requireValue(!(await ctx.svc.entities.InventoryAccountingMovement.count({company_id:fresh.id,movement_key:key})),'This requisition has prepared stock-cost evidence. Reconcile an interrupted release before retrying.',409);
   const cost=computeIngredientCost(move.actualInStock,getItemStockUnit(item),item,rules);requireValue(cost.ok&&Number.isFinite(cost.totalCost),'Released consumable stock needs a verified carrying cost.');
   const movement={movement_key:key,branch_id:event.branch_id,source_entity:'KitchenReleaseSlip',source_id:slip.id,resource_id:move.reservation.id,kind:'custody_issue',status:'prepared',entry_date,occurred_at,currency:fresh.currency,quantity:move.actualInStock,amount:cost.totalCost,recognition:'delivery',snapshot:{items:[{inventory_item_id:item.id,category_id:item.category_id,quantity:move.actualInStock,source_quantity:move.actual,source_unit:move.line.unit||move.reservation.unit||getItemStockUnit(item),unit:getItemStockUnit(item),cost:cost.totalCost}],event_id:event.id}};
   const plan=await inventoryPlan(ctx,fresh,movement);movement.snapshot.plan=plan;movement.binding_ids=[...new Set(plan.mapping_bindings.map(b=>b.binding_id))];records.push(await inventoryRecord(ctx,fresh,movement));
  }return records;
 });
}