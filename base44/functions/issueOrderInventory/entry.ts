import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getEffectivePermissions } from '../../shared/resolveEffectivePermissions.js';
import { requireValue } from '../../shared/financeValidation.js';
import { withFinanceLock,financeBranch } from '../../shared/financeAccess.js';
import { inventoryOwner,inventoryDate,inventoryRecord } from '../../shared/inventoryAccountingContext.js';
import { inventoryPolicy,inventorySnapshotKey } from '../../shared/inventoryAccountingRules.js';
import { saleStockPlan } from '../../shared/inventorySalePlan.js';
import { inventoryPlan } from '../../shared/inventoryAccountingPosting.js';
import { movementRow, recordMovements } from '../../shared/inventoryMovements.js';
export default async function(req) {
 try {
  const base44=createClientFromRequest(req),user=await base44.auth.me().catch(e=>e.status===401?null:Promise.reject(e));requireValue(user,'Sign in to issue sale stock.',401);
  const permissions=await getEffectivePermissions(base44,user),admin=user.role==='admin';requireValue(admin||!permissions.access_denied&&(permissions.cashier_edit||permissions.pos_edit),'Cashier or POS editing permission is required.',403);
  const input=await req.json().catch(()=>({}));requireValue(typeof input.order_id==='string'&&input.order_id,'Select the saved sale.');
  const db=base44.asServiceRole.entities,order=await db.Order.get(input.order_id),company=await inventoryOwner(db,order.branch_id);
  requireValue(admin||!permissions.branch_id||permissions.branch_id===order.branch_id,'Sale is outside the assigned branch.',403);
  if(!company)return Response.json({handled:false});
  const occurred_at=new Date().toISOString(),entry_date=await inventoryDate(db,occurred_at);if(entry_date<inventoryPolicy(company).from)return Response.json({handled:false});
  const ctx={base44,svc:base44.asServiceRole,user,permissions,admin};financeBranch(ctx,company,order.branch_id);
  return Response.json(await withFinanceLock(ctx,company,async fresh=>{
   if(!inventoryPolicy(fresh).enabled)return {handled:false};
   const key=inventorySnapshotKey(fresh,'sale',order.id),prior=await db.InventoryAccountingMovement.filter({company_id:company.id,movement_key:key},{limit:1});
   if(prior.items.length){requireValue(prior.items[0].status==='applied','Stock issue was interrupted. Reconcile the prepared movement before retrying; stock will not be deducted twice.',409);requireValue(prior.items[0].snapshot.source_items===JSON.stringify(order.items),'Sale changed after stock was issued.',409);return {handled:true,movement_id:prior.items[0].id,already_applied:true};}
   requireValue(['pending','preparing'].includes(order.status),'New inventory evidence cannot be inferred for an already-paid or cancelled sale.');
   const items=await saleStockPlan(ctx,fresh,order,entry_date);
   const movement={movement_key:key,branch_id:order.branch_id,source_entity:'Order',source_id:order.id,kind:'sale',status:'prepared',entry_date,occurred_at,currency:fresh.currency,recognition:inventoryPolicy(fresh).cogs_trigger,snapshot:{items,source_items:JSON.stringify(order.items)}};
   const plan=await inventoryPlan(ctx,fresh,movement);movement.snapshot.plan=plan;movement.binding_ids=[...new Set(plan.mapping_bindings.map(b=>b.binding_id))];
   const saved=await inventoryRecord(ctx,fresh,movement);
   const movementRows=[];
   for(const item of items){await db.InventoryItem.updateMany({id:item.inventory_item_id,quantity:item.before_quantity},{$set:{quantity:item.after_quantity}});const actual=await db.InventoryItem.get(item.inventory_item_id);requireValue(actual.quantity===item.after_quantity,'Stock changed concurrently. Reconcile the prepared issue before proceeding.',409);
    movementRows.push(movementRow(actual,{key:`sale:${order.id}:${item.inventory_item_id}`,direction:'out',type:'sale',quantity:item.before_quantity-item.after_quantity,before:item.before_quantity,after:item.after_quantity,source_entity:'Order',source_id:order.id,source_label:`Sale #${order.id.slice(-8).toUpperCase()}${order.customer_name?` · ${order.customer_name}`:''}`,actor_email:user.email}));}
   await db.InventoryAccountingMovement.update(saved.id,{status:'applied'});await recordMovements(db,movementRows);return {handled:true,movement_id:saved.id};
  }));
 }catch(error){return Response.json({error:error.message},{status:error.status||500});}
}