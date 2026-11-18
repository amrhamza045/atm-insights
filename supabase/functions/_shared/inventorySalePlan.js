import { requireValue } from './financeValidation.js';
import { loadMappingBindings,resolveAccountBinding } from './financeBindingResolver.js';
import { inventoryItemStages } from './inventoryItemStages.js';
import { loadConversionRules,toStockQuantity,getItemStockUnit,computeIngredientCost } from './unitConversion.js';
export async function saleStockPlan(ctx,company,order,date) {
 const db=ctx.svc.entities,menuIds=[...new Set((order.items||[]).map(i=>i.menu_item_id))];requireValue(menuIds.length>0&&menuIds.length<=100,'Sale needs 1–100 menu items.');
 const [menu,rules,bindings]=await Promise.all([db.MenuItem.filter({id:{$in:menuIds}},{limit:100}),loadConversionRules(db),loadMappingBindings(ctx,company,[{account_key:'INVENTORY_CONTROL_ACCOUNT'}])]);
 const inventoryIds=[...new Set(menu.items.flatMap(p=>[p.output_inventory_item_id,...(p.recipe||[]).map(i=>i.inventory_item_id),...Object.values(p.size_recipes||{}).flatMap(r=>r.map(i=>i.inventory_item_id))]).filter(Boolean))];
 requireValue(inventoryIds.length<=500,'Sale recipes reference too many stock items.');
 const stock=await db.InventoryItem.filter({id:{$in:inventoryIds}},{limit:500});
 const typed=await inventoryItemStages(db,bindings,stock.items.map(i=>({...i,inventory_item_id:i.id})),{date,dimensions:{branch_id:order.branch_id,currency:company.currency}});
 const needs=new Map(),items=new Map(typed.map(i=>[i.id,i]));
 const add=async(id,quantity,unit)=>{
  const inv=items.get(id);requireValue(inv,'A recipe stock item no longer exists.');
  requireValue(inv.branch_id===order.branch_id,'Sale inventory must belong to its operational branch.');
  const converted=toStockQuantity(quantity,unit||getItemStockUnit(inv),inv,rules);requireValue(converted.ok,'Stock issue unit cannot be converted.');
  needs.set(id,(needs.get(id)||0)+converted.quantity);
 };
 for(const line of order.items){const product=menu.items.find(m=>m.id===line.menu_item_id);requireValue(product&&Number.isFinite(Number(line.quantity))&&Number(line.quantity)>0,'Invalid sale item or quantity.');
  if(product.output_inventory_item_id){const output=items.get(product.output_inventory_item_id);requireValue(output,'Linked finished inventory no longer exists.');const binding=resolveAccountBinding(bindings,'INVENTORY_CONTROL_ACCOUNT',{date,dimensions:{branch_id:order.branch_id,category:output.category_id,currency:company.currency,...(output.inventory_stage?{inventory_stage:output.inventory_stage}:{})}});
   requireValue(['finished','semi_finished'].includes(binding.inventory_stage),'A linked sale output must map to finished or semi-finished inventory.');items.set(output.id,output);await add(output.id,Number(line.quantity),getItemStockUnit(output));continue;}
  let recipe=product.recipe||[];const size=typeof line.selectedSize==='string'?line.selectedSize:line.selectedSize?.name;
  if(size&&product.size_recipes?.[size]?.length)recipe=product.size_recipes[size];
  requireValue(recipe.length>0,'A sold product needs linked finished inventory or a recipe before actual COGS can be captured.');
  for(const ing of recipe){requireValue(Number(ing.quantity_needed)>0,'Recipe stock quantities must be positive.');await add(ing.inventory_item_id,Number(ing.quantity_needed)*Number(line.quantity),ing.unit);}
 }
 return [...needs].map(([id,quantity])=>{const inv=items.get(id),c=computeIngredientCost(quantity,getItemStockUnit(inv),inv,rules);
  requireValue(c.ok&&Number.isFinite(c.totalCost),'Stock issue needs verified carrying costs.');requireValue(Number(inv.quantity)>=quantity,'Insufficient stock for the sale.');
  return {inventory_item_id:id,category_id:inv.category_id,...(inv.inventory_stage?{inventory_stage:inv.inventory_stage}:{}),quantity,unit:getItemStockUnit(inv),cost:c.totalCost,before_quantity:Number(inv.quantity),after_quantity:Math.round((Number(inv.quantity)-quantity)*10000)/10000};
 });
}