import { requireValue, moneyUnits } from './financeValidation.js';
import { toStockQuantity, getItemStockUnit, computeIngredientCost, roundQty } from './unitConversion.js';
import { movementRow, recordMovements } from './inventoryMovements.js';
export function supplierReturnValues(invoice,quantities,items,history,rules,decimals){
 requireValue(Array.isArray(quantities)&&quantities.length>0&&quantities.length<=20,'Choose 1–20 invoice lines to return.');
 const seen=new Set(),stockIds=new Set(),scale=10**decimals,result=[];
 for(const request of quantities){
  const index=request.line_index,q=Number(request.quantity),line=invoice.items?.[index];
  requireValue(Number.isInteger(index)&&index>=0&&line&&Number.isFinite(q)&&q>0&&Math.abs(q*10000-Math.round(q*10000))<0.00001,'Choose a valid line and positive quantity with at most four decimals.');
  requireValue(!seen.has(index)&&!stockIds.has(line.inventory_item_id),'Return each stock item once per submission; use a separate return for repeated invoice lines.');seen.add(index);stockIds.add(line.inventory_item_id);
  const original=Number(line.quantity),cost=Number(line.total_cost),item=items.get(line.inventory_item_id);
  requireValue(Number.isFinite(original)&&original>0&&Number.isFinite(cost)&&cost>0,'The original invoice quantity and cost must be verified.');
  requireValue(item&&item.branch_id===invoice.branch_id,'Stock item must belong to the invoice branch.',403);
  const previous=history.flatMap(e=>e.account_snapshot?.items||[]).filter(i=>i.line_index===index),used=previous.reduce((n,i)=>n+Number(i.quantity),0),credited=previous.reduce((n,i)=>n+moneyUnits(i.credit,decimals),0);
  requireValue(Number.isFinite(used)&&used>=0&&used+q<=original+0.0000001,'Return quantity exceeds the original invoice quantity remaining.');
  const credit=(Math.round(moneyUnits(cost,decimals)*(used+q)/original)-credited)/scale;
  requireValue(credit>0,'The return credit must be positive at the company currency precision.');
  const received=item.selling_unit!=='weight'&&Number(line.pieces_count)>0?{ok:true,quantity:Number(line.pieces_count)}:toStockQuantity(original,line.unit,item,rules);
  requireValue(received.ok&&received.quantity>0,'Original received stock quantity needs an explicit unit conversion.');
  const returnedStock=previous.reduce((n,i)=>n+Number(i.stock_quantity),0);
  requireValue(Number.isFinite(returnedStock)&&returnedStock>=0,'Previous return stock evidence is incomplete.');
  const quantity=roundQty(roundQty(received.quantity*(used+q)/original,4)-returnedStock,4),available=Number(item.quantity),carrying=computeIngredientCost(quantity,getItemStockUnit(item),item,rules);
  requireValue(quantity>0&&Number.isFinite(available)&&available>=quantity,'Insufficient branch stock for this supplier return.');
  requireValue(carrying.ok&&carrying.totalCost>0,'A verified current stock carrying cost is required.');
  const stockCost=Math.round(carrying.totalCost*scale)/scale;requireValue(stockCost>0,'Stock cost is below currency precision.');
  result.push({line_index:index,inventory_item_id:item.id,inventory_item_name:item.name||line.inventory_item_name,category_id:item.category_id,quantity:q,unit:line.unit,credit,stock_quantity:quantity,stock_unit:getItemStockUnit(item),stock_cost:stockCost,stock_before:available,stock_version:item.updated_date});
 }
 return {items:result,credit:result.reduce((n,i)=>n+moneyUnits(i.credit,decimals),0)/scale,stock_cost:result.reduce((n,i)=>n+moneyUnits(i.stock_cost,decimals),0)/scale};
}
export async function applySupplierReturnStock(db,entry){
 for(const line of entry.account_snapshot.items){
  const item=await db.InventoryItem.get(line.inventory_item_id);
  if(item.supplier_return_entry_id===entry.id)continue;
  requireValue(item.updated_date===line.stock_version&&Number(item.quantity)===line.stock_before,'Stock changed after the saved return. Administrator reconciliation is required before resuming.',409);
  await db.InventoryItem.updateMany({id:item.id,updated_date:line.stock_version,quantity:line.stock_before},{$set:{quantity:roundQty(line.stock_before-line.stock_quantity,4),supplier_return_entry_id:entry.id}});
  requireValue((await db.InventoryItem.get(item.id)).supplier_return_entry_id===entry.id,'Stock changed while applying the return; reconcile before retrying.',409);
  await recordMovements(db,[movementRow(item,{key:`supplier_return:${entry.id}:${line.line_index}`,direction:'out',type:'supplier_return',quantity:line.stock_quantity,unit:line.stock_unit,before:line.stock_before,after:roundQty(line.stock_before-line.stock_quantity,4),cost_impact:line.stock_cost,source_entity:'SupplierLedgerEntry',source_id:entry.id,source_label:`Return on invoice ${entry.invoice_number||''}`.trim(),actor_email:entry.actor_email})]);
 }
}