import { base44 } from '@/api/base44Client';
import { stockMovement, logStockMovements } from '@/lib/stockMovements';
export default async function issueOrderStock(orderId,cart,menuItems,{inferSize=true}={}) {
 const {data}=await base44.functions.invoke('issueOrderInventory',{order_id:orderId});
 if(data.handled)return;
 // Preserve the existing stock behavior for branches that have not enabled lifecycle accounting.
 const deductions={};
 for(const c of cart){const menu=menuItems.find(m=>m.id===c.id);if(!menu)continue;
  const size=c.selectedSize?.name||(typeof c.selectedSize==='string'?c.selectedSize:null);let recipe=menu.recipe||[];
  if(size&&menu.size_recipes?.[size]?.length)recipe=menu.size_recipes[size];
  else if(inferSize&&!size&&!recipe.length){const match=Object.keys(menu.size_recipes||{}).find(s=>(c.name||'').toUpperCase().includes(s.toUpperCase()));if(match)recipe=menu.size_recipes[match];}
  for(const ing of recipe){if(ing.inventory_item_id)deductions[ing.inventory_item_id]=(deductions[ing.inventory_item_id]||0)+ing.quantity_needed*c.quantity;}
 }
 const ids=Object.keys(deductions);if(!ids.length)return;
 for(let offset=0;offset<ids.length;offset+=100){const page=await base44.entities.InventoryItem.filter({id:{$in:ids.slice(offset,offset+100)}},{limit:100});
  await Promise.all(page.items.map(item=>base44.entities.InventoryItem.update(item.id,{quantity:(item.quantity||0)-deductions[item.id]})));
  await logStockMovements(page.items.map(item=>stockMovement(item,{key:`sale:${orderId}:${item.id}`,direction:'out',type:'sale',quantity:deductions[item.id],before:item.quantity||0,after:(item.quantity||0)-deductions[item.id],source_entity:'Order',source_id:orderId,source_label:`Sale #${String(orderId).slice(-8).toUpperCase()}`})));
 }
}