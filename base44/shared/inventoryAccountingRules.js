import { requireValue, moneyUnits } from './financeValidation.js';
import { resolveStockBinding } from './inventoryMappingMessages.js';
export const INVENTORY_KEYS = ['INVENTORY_CONTROL_ACCOUNT','INVENTORY_WIP_ACCOUNT','INVENTORY_COGS_ACCOUNT'];
export const INVENTORY_STAGES = ['raw','semi_finished','finished'];
export const inventoryPolicy = company => company.module_policy?.inventory || {};
export const inventorySnapshotKey = (company,kind,id) => `${company.id}:inventory:${kind}:${id}`;
export function inventoryJournal(company,movement,bindings) {
 const {snapshot:s,entry_date:date,branch_id:branch}=movement, scale=10**company.currency_decimals, lines=[], mapping_bindings=[];
 requireValue(movement.currency===company.currency,'Inventory evidence currency differs from the company.');
 const amount=value=>{requireValue(Number.isFinite(Number(value))&&Number(value)>=0,'Missing or invalid actual stock cost.');return moneyUnits(Math.round(Number(value)*scale)/scale,company.currency_decimals)/scale;};
 const add=(key,item,debit,credit)=>{
  requireValue(item.category_id,'A stock item has no inventory category.');
  // COGS lines carry their issue type (planned, extra, production, tasting) so a dated mapping can route one type elsewhere.
  const issue=key===INVENTORY_KEYS[2]&&item.issue_type?item.issue_type:'';
  const b=resolveStockBinding(bindings,key,{date,dimensions:{branch_id:branch,category:item.category_id,currency:company.currency,...(key===INVENTORY_KEYS[0]&&item.inventory_stage?{inventory_stage:item.inventory_stage}:{}),...(issue?{issue_type:issue}:{})}},{category:item.category_id,branch_id:branch,issue_type:issue});
  if(key===INVENTORY_KEYS[0]&&movement.kind==='production'&&item===s.output)requireValue(['semi_finished','finished'].includes(b.inventory_stage),'Production output must map to semi-finished or finished inventory.');
  mapping_bindings.push({key,binding_id:b.id,binding_updated_date:b.updated_date,inventory_item_id:item.inventory_item_id});
  if(!debit&&!credit)return;
  lines.push({account_id:b.account_id,debit,credit,cost_center:branch,channel:'inventory',product_category:item.category_id,product_reference:item.inventory_item_id});
 };
 if(movement.kind==='production') {
  requireValue(s.inputs?.length&&s.output?.inventory_item_id&&Number(s.output.quantity)>0,'Production needs actual ingredient and output evidence.');
  const total=amount(s.output.cost),units=s.inputs.map(i=>moneyUnits(amount(i.cost),company.currency_decimals));
  requireValue(Math.abs(units.reduce((a,b)=>a+b,0)-moneyUnits(total,company.currency_decimals))<=s.inputs.length,'Recorded production costs do not reconcile.');
  // Allocate rounding residue to the final ingredient, preserving the batch total exactly.
  let cumulative=0,assignedUnits=0;s.inputs.forEach((item,i)=>{cumulative+=Number(item.cost);const target=i===s.inputs.length-1?moneyUnits(total,company.currency_decimals):Math.round(cumulative*scale);const value=(target-assignedUnits)/scale;requireValue(value>=0,'Ingredient costs cannot exceed the recorded production total.');assignedUnits=target;add(INVENTORY_KEYS[1],s.output,value,0);add(INVENTORY_KEYS[0],item,0,value);});
  add(INVENTORY_KEYS[0],s.output,total,0);add(INVENTORY_KEYS[1],s.output,0,total);
 } else {
  requireValue(s.items?.length,'No immutable stock issue evidence is available.');
  for(const item of s.items){requireValue(Number(item.quantity)>0,'Invalid issued quantity.');const value=amount(item.cost);add(INVENTORY_KEYS[2],item,value,0);add(INVENTORY_KEYS[0],item,0,value);}
 }
 const grouped=new Map();for(const line of lines){const key=JSON.stringify([line.account_id,line.product_category,line.debit>0]);const old=grouped.get(key);if(old){old.debit=amount(old.debit+line.debit);old.credit=amount(old.credit+line.credit);old.product_reference='';}else grouped.set(key,{...line});}
 return {lines:[...grouped.values()],mapping_bindings};
}