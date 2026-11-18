import { buildModuleJournal } from './financeModuleRules.js';
import { loadMappingBindings, resolveAccountBinding } from './financeBindingResolver.js';
import { inventoryItemStages } from './inventoryItemStages.js';
import { requireValue, moneyUnits } from './financeValidation.js';
import { checkFreight } from './purchaseFreight.js';
import { companyPaymentMethods } from './financePaymentMethodSource.js';
export const PURCHASE_KEYS=['RAW_INV_ACCOUNT','VENDOR_AP_ACCOUNT'];
export function purchaseMappingJournal(company,source,date,bindings,itemStages=null){
 const lifecycle=company.module_policy?.inventory;
 const assetKey=lifecycle?.enabled&&date>=lifecycle.from?'INVENTORY_CONTROL_ACCOUNT':PURCHASE_KEYS[0];
 if(assetKey==='INVENTORY_CONTROL_ACCOUNT')requireValue(bindings.some(b=>b.mapping_key===assetKey),'Configure category inventory control accounts before posting purchases.');
 if(!bindings.some(b=>[assetKey,PURCHASE_KEYS[1]].includes(b.mapping_key)))return null;
 requireValue(company.currency==='EGP','Purchase invoice values are recorded in EGP; verified currency conversion is required.');
 // Reuse the existing quantity, price, status and total reconciliation before resolving accounts.
 const built=buildModuleJournal({...company,module_policy:{map:{inventory:PURCHASE_KEYS[0],suppliers:PURCHASE_KEYS[1]}}},'PurchaseInvoice',source,date);
 const lines=[],mapping_bindings=[];
 checkFreight(source);
 for(const item of source.items){
  // Landed cost (B08): each line carries its share of the invoice freight into inventory.
  const amount=(moneyUnits(item.total_cost,company.currency_decimals)+moneyUnits(item.allocated_freight||0,company.currency_decimals))/10**company.currency_decimals;if(!amount)continue;
  const stage=item.inventory_stage||itemStages?.get?.(item.inventory_item_id);
  const sample={date,dimensions:{branch_id:source.branch_id,currency:company.currency,supplier_id:source.supplier_id,category:item.category_id,...(stage?{inventory_stage:stage}:{}),original_tx_id:source.id}};
  [assetKey,PURCHASE_KEYS[1]].forEach((key,i)=>{
   const binding=resolveAccountBinding(bindings,key,sample);
   lines.push({...built.lines[i],account_id:binding.account_id,debit:i===0?amount:0,credit:i===1?amount:0,product_category:item.category_id||''});
   mapping_bindings.push({key,binding_id:binding.id,binding_updated_date:binding.updated_date,inventory_item_id:item.inventory_item_id});
  });
 }
 return {...built,lines,mapping_bindings,posting_path:'mapped_purchase'};
}
export async function buildRoutedModuleJournal(ctx,company,entity,source,date,options={}){
 if(entity==='PurchaseInvoice'){
  const bindings=await loadMappingBindings(ctx,company,[...PURCHASE_KEYS,'INVENTORY_CONTROL_ACCOUNT'].map(account_key=>({account_key})));
  const lifecycle=company.module_policy?.inventory;
  const stagedItems=lifecycle?.enabled&&date>=lifecycle.from?await inventoryItemStages(ctx.svc.entities,bindings,source.items||[],{date,dimensions:{branch_id:source.branch_id,currency:company.currency,supplier_id:source.supplier_id}}):source.items;
  const built=purchaseMappingJournal(company,{...source,items:stagedItems},date,bindings);if(built)return built;
 }
 // Sales collections post to the account of the payment method used.
 if(entity==='Order')options={...options,methods:await companyPaymentMethods(ctx.svc.entities,company)};
 return buildModuleJournal(company,entity,source,date,options);
}
export function validatePurchaseAccounts(built,lines){
 if(built.posting_path!=='mapped_purchase')return;
 requireValue(lines.every(l=>l.debit>0?l.account_code.startsWith('1'):l.account_code.startsWith('2')),'Purchase inventory must debit an asset account and supplier payables must credit a liability account.');
}
export async function purchasePostingCompanies(ctx,source){
 const page=await ctx.svc.entities.FinanceCompany.filter({is_active:{$ne:false},branch_ids:source.branch_id},{limit:50});
 requireValue(!page.has_more,'Too many company owners for this branch.',409);
 if(!page.items.length)return {items:[]};
 const configured=await ctx.svc.entities.FinanceAccountBinding.aggregate({query:{company_id:{$in:page.items.map(c=>c.id)},mapping_key:{$in:[...PURCHASE_KEYS,'INVENTORY_CONTROL_ACCOUNT']}},groupBy:'company_id',limit:50});
 requireValue(!configured.truncated,'Purchase mapping company ownership is ambiguous.',409);
 const ids=new Set(configured.rows.map(r=>r.company_id));
 return {items:page.items.filter(c=>ids.has(c.id)||c.module_policy?.enabled)};
}