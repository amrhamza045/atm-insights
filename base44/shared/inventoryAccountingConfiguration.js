import { financePermission } from './financeAccess.js';
import { openFinanceDate } from './financeProposals.js';
import { requireValue } from './financeValidation.js';
import { INVENTORY_KEYS, INVENTORY_STAGES, inventoryPolicy } from './inventoryAccountingRules.js';
import { validateInventoryCoverage } from './inventoryConfigurationCoverage.js';
import { ISSUE_TYPES, TASTING_HOLDING_KEY } from './inventoryMappingMessages.js';
export async function inventoryConfiguration(ctx,company,input) {
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Inventory mapping requires unrestricted company access.',403);
 if(input.action==='inventory_configuration')return {policy:inventoryPolicy(company),keys:INVENTORY_KEYS,stages:INVENTORY_STAGES};
 financePermission(ctx,'finance_accounts_manage');financePermission(ctx,'finance_journal_approve');
 const data=input.data||{};
 if(data.enabled===false)return {company:await ctx.svc.entities.FinanceCompany.update(company.id,{module_policy:{...company.module_policy,inventory:{...inventoryPolicy(company),enabled:false}}})};
 requireValue(data.confirmed===true,'Confirm actual-cost inventory accounting and the recognition policy.');openFinanceDate(company,data.from);
 requireValue(['sale','delivery'].includes(data.cogs_trigger),'Select paid sale or confirmed delivery recognition.');
 requireValue(company.currency==='EGP','Operational stock costs are recorded in EGP. Currency conversion must be verified before using another currency.');
 const peers=await ctx.svc.entities.FinanceCompany.filter({id:{$ne:company.id},is_active:{$ne:false},branch_ids:{$in:company.branch_ids}},{limit:100});
 requireValue(!peers.has_more&&!peers.items.some(c=>inventoryPolicy(c).enabled),'Another company already owns inventory accounting for one of these branches.',409);
 await validateInventoryCoverage(ctx,company,data.from);
 const policy={enabled:true,from:data.from,cogs_trigger:data.cogs_trigger,configured_by:ctx.user.email,configured_at:new Date().toISOString()};
 await ctx.svc.entities.FinanceCompany.update(company.id,{module_policy:{...company.module_policy,inventory:policy}});
 // Read back: a setting the company record cannot hold must fail loudly, never look saved.
 const saved=await ctx.svc.entities.FinanceCompany.get(company.id);
 requireValue(inventoryPolicy(saved).enabled===true&&inventoryPolicy(saved).from===data.from,'The stock accounting setting did not save, so nothing was switched on. Reload and try again.',409);
 return {company:saved};
}
export async function validateInventoryBinding(ctx,company,data,account) {
 const issue=data.conditions?.issue_type;
 requireValue(!issue||data.mapping_key===INVENTORY_KEYS[2]&&ISSUE_TYPES[issue],'Issue-type routing applies only to COGS: planned stock, extra stock, event production or food tasting.');
 if(data.mapping_key===TASTING_HOLDING_KEY){
  requireValue(account.classification==='assets','The tastings holding account must be an asset account.');
  if(data.conditions?.category){const category=await ctx.svc.entities.InventoryCategory.get(data.conditions.category);requireValue(category.is_active!==false&&(!category.branch_id||company.branch_ids.includes(category.branch_id)),'Category is inactive or outside this company.');}
  return;
 }
 if(!INVENTORY_KEYS.includes(data.mapping_key))return;
 requireValue(account.classification===(data.mapping_key===INVENTORY_KEYS[2]?'cogs':'assets'),'Inventory control/WIP mappings require asset accounts; COGS mappings require COGS accounts.');
 requireValue(typeof data.conditions?.category==='string'&&data.conditions.category,'Select a specific inventory category.');
 const category=await ctx.svc.entities.InventoryCategory.get(data.conditions.category);
 requireValue(category.is_active!==false&&(!category.branch_id||company.branch_ids.includes(category.branch_id)),'Category is inactive or outside this company.');
 if(data.mapping_key===INVENTORY_KEYS[0])requireValue(INVENTORY_STAGES.includes(data.inventory_stage),'Select Raw materials, Semi-finished or Finished goods.');
}