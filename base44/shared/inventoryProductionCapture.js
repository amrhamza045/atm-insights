import { requireValue } from './financeValidation.js';
import { withFinanceLock } from './financeAccess.js';
import { inventoryOwner,inventoryDate,inventoryRecord } from './inventoryAccountingContext.js';
import { inventoryPolicy,inventorySnapshotKey } from './inventoryAccountingRules.js';
import { inventoryPlan } from './inventoryAccountingPosting.js';
import { computeIngredientCost,getItemStockUnit,toStockQuantity } from './unitConversion.js';
export async function prepareProductionInventory(base44,user,{order,recipe,invItems,itemIdOf,resolvedNeeds,byOutput,rules,actualOutput,outputItemId}) {
 const db=base44.asServiceRole.entities,company=await inventoryOwner(db,order.branch_id);if(!company)return null;
 const occurred_at=new Date().toISOString(),entry_date=await inventoryDate(db,occurred_at);if(entry_date<inventoryPolicy(company).from)return null;
 const ctx={base44,svc:base44.asServiceRole,user,admin:true,permissions:{}};
 return withFinanceLock(ctx,company,async fresh=>{
  if(!inventoryPolicy(fresh).enabled)return null;
  const key=inventorySnapshotKey(fresh,'production',order.id),existing=await db.InventoryAccountingMovement.filter({movement_key:key,company_id:fresh.id},{limit:1});
  requireValue(!existing.items.length,'This production already has stock accounting evidence. Reconcile an interrupted completion before retrying.',409);
  const output=await db.InventoryItem.get(outputItemId);requireValue(output.branch_id===order.branch_id,'Production output must belong to the same branch.');
  const quantity=toStockQuantity(actualOutput,recipe.output_unit||getItemStockUnit(output),output,rules);requireValue(quantity.ok&&quantity.quantity>0,'Production output needs a positive, convertible stock quantity.');
  const inputs=[];for(const ingredient of recipe.ingredients||[]){const qty=(Number(ingredient.quantity_needed)||0)*(order.target_quantity||1);if(qty<=0)continue;const id=itemIdOf[ingredient.inventory_item_id],item=invItems[id],need=resolvedNeeds[id],sub=byOutput[ingredient.inventory_item_id];
   const c=computeIngredientCost(qty,ingredient.unit||need?.stockUnit,item,rules,sub?Number(sub.total_cost)/Number(sub.output_quantity||1):null);
   requireValue(c.ok&&Number.isFinite(c.totalCost),'Every ingredient needs a verified converted carrying cost.');
   inputs.push({inventory_item_id:id,category_id:item.category_id,quantity:need.qtyStock,unit:need.stockUnit,cost:Math.round(c.totalCost*10000)/10000});
  }
  const cost=Math.round(inputs.reduce((sum,i)=>sum+i.cost,0)*10000)/10000;
  const movement={movement_key:key,branch_id:order.branch_id,source_entity:'ProductionOrder',source_id:order.id,resource_id:order.id,kind:'production',status:'prepared',entry_date,occurred_at,currency:fresh.currency,quantity:quantity.quantity,amount:cost,recognition:'production',snapshot:{inputs,output:{inventory_item_id:output.id,category_id:output.category_id,quantity:quantity.quantity,source_quantity:actualOutput,source_unit:recipe.output_unit||getItemStockUnit(output),unit:getItemStockUnit(output),cost},event_id:order.catering_event_id||''}};
  const plan=await inventoryPlan(ctx,fresh,movement);movement.snapshot.plan=plan;movement.binding_ids=[...new Set(plan.mapping_bindings.map(b=>b.binding_id))];
  return inventoryRecord(ctx,fresh,movement);
 });
}