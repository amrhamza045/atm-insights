import { requireValue } from './financeValidation.js';
import { inventoryRecord,inventoryDate } from './inventoryAccountingContext.js';
import { inventorySnapshotKey,inventoryPolicy } from './inventoryAccountingRules.js';
import { inventoryPlan,postInventoryMovement } from './inventoryAccountingPosting.js';
export async function captureDeliveryInventory(ctx,company,checkpoint) {
 const db=ctx.svc.entities,trip=await db.CateringTrip.get(checkpoint.trip_id);
 requireValue(checkpoint.stage==='delivered'&&trip.event_id===checkpoint.event_id&&trip.branch_id===checkpoint.branch_id&&trip.stage!=='cancelled','Invalid or cancelled delivery evidence.');
 const date=await inventoryDate(db,checkpoint.confirmed_at);if(date<inventoryPolicy(company).from)return [];
 const movements=[];
 for(const line of trip.checklist||[]){if(!['production','stock'].includes(line.source))continue;
  const actual=(checkpoint.item_details||[]).find(i=>i.item_key===line.item_key);requireValue(actual,'Delivery needs an actual count for each consumable checklist item.');
  const qty=Number(actual.actual_quantity);requireValue(Number.isFinite(qty)&&qty>=0&&qty<=Number(line.quantity),'Delivery quantity exceeds the trip allocation.');if(!qty)continue;
  const key=inventorySnapshotKey(company,'delivery',`${checkpoint.id}:${line.source}:${line.ref_id}`),prior=await db.InventoryAccountingMovement.filter({company_id:company.id,movement_key:key},{limit:1});if(prior.items.length){movements.push(prior.items[0]);continue;}
  const sources=await db.InventoryAccountingMovement.filter({company_id:company.id,...(line.source==='production'?{source_entity:'ProductionOrder',source_id:line.ref_id,kind:'production'}:{resource_id:line.ref_id,kind:'custody_issue'}),status:'applied'},{limit:2});
  requireValue(sources.items.length===1&&!sources.has_more,'Delivery requires one unambiguous immutable production or requisition issue-cost record.');
  const production=sources.items[0];requireValue(production.snapshot.event_id===trip.event_id,'Stock evidence belongs to a different event.');
  const posted=await postInventoryMovement(ctx,company,production);requireValue(!posted.blocked,'Resolve the source stock cost exception before recognizing delivery COGS.',409);
  const out=line.source==='production'?production.snapshot.output:production.snapshot.items[0];requireValue(!actual.unit||actual.unit===out.source_unit,'Delivered units differ from the recorded production output.');
  const quantity=qty*out.quantity/out.source_quantity;
  const used=await db.InventoryAccountingMovement.aggregate({query:{company_id:company.id,kind:'delivery',resource_id:`${line.source}:${line.ref_id}`,status:'applied'},sum:['quantity','amount']});
  const remaining=out.quantity-(used.rows[0]?.sum_quantity||0);requireValue(quantity<=remaining+1e-8,'This production output has already been delivered or exceeds its remaining quantity.',409);
  const scale=10**company.currency_decimals,remainingCost=Math.round(out.cost*scale)/scale-(used.rows[0]?.sum_amount||0);
  const cost=Math.abs(quantity-remaining)<1e-8?remainingCost:Math.round(out.cost*quantity/out.quantity*scale)/scale;
  const movement={movement_key:key,branch_id:checkpoint.branch_id,source_entity:'CateringCustodyCheckpoint',source_id:checkpoint.id,resource_id:`${line.source}:${line.ref_id}`,kind:'delivery',status:'applied',entry_date:date,occurred_at:checkpoint.confirmed_at,currency:company.currency,quantity,amount:cost,recognition:'event_close',snapshot:{items:[{inventory_item_id:out.inventory_item_id,category_id:out.category_id,...(out.inventory_stage?{inventory_stage:out.inventory_stage}:{}),quantity,unit:out.unit,cost}],production_movement_id:production.id,trip_id:trip.id,event_id:trip.event_id}};
  const plan=await inventoryPlan(ctx,company,movement);movement.snapshot.plan=plan;movement.binding_ids=[...new Set(plan.mapping_bindings.map(b=>b.binding_id))];movements.push(await inventoryRecord(ctx,company,movement));
 }
 return movements;
}