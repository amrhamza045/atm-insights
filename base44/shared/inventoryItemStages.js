import { bindingMatches } from './financeBindingResolver.js';
import { requireValue } from './financeValidation.js';
// Existing single-type category routes retain their behavior. Where several types
// coexist, use the actual item's recipe relationship, never a category-name guess.
export async function inventoryItemStages(db,bindings,items,sample) {
 const needs=items.filter(item=>!item.inventory_stage&&new Set(bindings.filter(b=>b.mapping_key==='INVENTORY_CONTROL_ACCOUNT'&&bindingMatches(b,{...sample,dimensions:{...sample.dimensions,category:item.category_id}})).map(b=>b.inventory_stage).filter(Boolean)).size>1);
 if(!needs.length)return items;
 const ids=[...new Set(needs.map(item=>item.inventory_item_id))];
 requireValue(ids.length<=500,'Too many items to resolve inventory types safely.');
 const [recipes,consumers]=await Promise.all([
  db.Recipe.filter({output_item_id:{$in:ids}},{limit:500}),
  db.Recipe.filter({'ingredients.inventory_item_id':{$in:ids}},{limit:500})
 ]);
 requireValue(!recipes.has_more&&!consumers.has_more,'Too many recipes to resolve inventory types safely.');
 const stages=new Map();
 for(const id of ids){
  const producers=recipes.items.filter(recipe=>recipe.output_item_id===id);
  const isMenuOutput=producers.some(recipe=>recipe.menu_item_id||recipe.recipe_source==='menu_item');
  const isIntermediate=consumers.items.some(recipe=>(recipe.ingredients||[]).some(ingredient=>ingredient.inventory_item_id===id));
  stages.set(id,!producers.length?'raw':isMenuOutput||!isIntermediate?'finished':'semi_finished');
 }
 return items.map(item=>stages.has(item.inventory_item_id)?{...item,inventory_stage:stages.get(item.inventory_item_id)}:item);
}