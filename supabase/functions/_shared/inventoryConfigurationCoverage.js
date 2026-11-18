import { requireValue } from './financeValidation.js';
import { loadMappingBindings,resolveAccountBinding,bindingMatches } from './financeBindingResolver.js';
import { INVENTORY_KEYS } from './inventoryAccountingRules.js';
import { getCompanyOffset,TIMEZONE_MISSING } from './companyTimezone.js';
export async function validateInventoryCoverage(ctx,company,date) {
 const db=ctx.svc.entities;requireValue(await getCompanyOffset(db)!==null,TIMEZONE_MISSING);
 const [groups,bindings]=await Promise.all([db.InventoryItem.aggregate({query:{branch_id:{$in:company.branch_ids}},groupBy:['branch_id','category_id'],limit:500}),loadMappingBindings(ctx,company,INVENTORY_KEYS.map(account_key=>({account_key})))]);
 requireValue(!groups.truncated,'Inventory category coverage is too large to validate safely.');
 requireValue(groups.rows.length>0,'Add branch inventory and category mappings before enabling lifecycle accounting.');
 const chosen=[];
 for(const row of groups.rows){requireValue(row.category_id,'An inventory item has no category. Categorize it before enabling accounting.');const sample={date,dimensions:{branch_id:row.branch_id,category:row.category_id,currency:company.currency}};
  const stages=[...new Set(bindings.filter(b=>b.mapping_key===INVENTORY_KEYS[0]&&bindingMatches(b,sample)).map(b=>b.inventory_stage))];
  for(const inventory_stage of stages.length?stages:[undefined]){
   const typed={...sample,dimensions:{...sample.dimensions,inventory_stage}};
   const control=resolveAccountBinding(bindings,INVENTORY_KEYS[0],typed),cogs=resolveAccountBinding(bindings,INVENTORY_KEYS[2],sample);chosen.push({binding:control,classification:'assets'},{binding:cogs,classification:'cogs'});
   if(['semi_finished','finished'].includes(control.inventory_stage))chosen.push({binding:resolveAccountBinding(bindings,INVENTORY_KEYS[1],sample),classification:'assets'});
  }
 }
 const accounts=await db.FinanceAccount.filter({company_id:company.id,id:{$in:[...new Set(chosen.map(c=>c.binding.account_id))]}},{limit:500});requireValue(!accounts.has_more,'Too many accounts to validate.');
 requireValue(chosen.every(c=>{const a=accounts.items.find(a=>a.id===c.binding.account_id);return a&&a.classification===c.classification&&a.active&&a.posting&&a.management_mapping&&(!a.effective_from||a.effective_from<=date)&&(!a.effective_to||a.effective_to>=date);}), 'Category mappings require active, effective asset/WIP accounts and COGS accounts with reporting mappings.');
}