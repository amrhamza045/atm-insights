import { requireValue, validateLines } from './financeValidation.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
import { loadMappingBindings, resolveAccountBinding } from './financeBindingResolver.js';
import { inventoryItemStages } from './inventoryItemStages.js';
import { moduleSnapshot } from './financeModuleRules.js';
export const SUPPLIER_RETURN_VARIANCE='PURCHASE_RETURN_VARIANCE_ACCOUNT';
export async function supplierReturnOriginal(ctx,invoice){
 const c=ctx.company,db=ctx.svc.entities;
 const page=await db.FinanceJournal.filter({company_id:c.id,branch_id:ctx.branch,source_entity:'PurchaseInvoice',source_id:invoice.id,status:'posted'},{limit:2});
 requireValue(page.items.length===1&&!page.has_more,'Reconcile the original invoice GL posting before returning goods.',409);
 const original=page.items[0];requireValue(JSON.stringify(original.source_summary?.source_snapshot)===JSON.stringify(moduleSnapshot('PurchaseInvoice',invoice)),'The original invoice changed after GL posting; reconcile it before a return.',409);
 const [reversed,reviewing]=await Promise.all([db.FinanceJournal.count({company_id:c.id,reversal_of:original.id,status:'posted'}),db.FinanceProposal.count({company_id:c.id,status:'pending',$or:[{source_entity:'FinanceJournal',source_id:original.id},{source_entity:'PurchaseInvoice',source_id:invoice.id}]})]);
 requireValue(!reversed&&!reviewing,'The original invoice posting is reversed or awaiting correction; reconcile it before returning goods.',409);
 return original;
}
export async function supplierReturnPlan(ctx,invoice,values,date){
 const c=ctx.company,db=ctx.svc.entities;openFinanceDate(c,date);
 const original=await supplierReturnOriginal(ctx,invoice);
 const assetKey=c.module_policy?.inventory?.enabled&&date>=c.module_policy.inventory.from?'INVENTORY_CONTROL_ACCOUNT':'RAW_INV_ACCOUNT';
 const bindings=await loadMappingBindings(ctx,c,[assetKey,SUPPLIER_RETURN_VARIANCE].map(account_key=>({account_key})));
 const items=await inventoryItemStages(db,bindings,values.items,{date,dimensions:{branch_id:ctx.branch,currency:c.currency,supplier_id:ctx.supplier.id}}),raw=[],mapping_bindings=[];
 const add=(id,item,debit,credit)=>raw.push({account_id:id,debit,credit,cost_center:ctx.branch,channel:'purchasing',product_reference:item.inventory_item_id,product_category:item.category_id,counterparty_reference:ctx.supplier.id});
 const route=(key,item)=>{const binding=resolveAccountBinding(bindings,key,{date,dimensions:{branch_id:ctx.branch,currency:c.currency,category:item.category_id,inventory_stage:item.inventory_stage,supplier_id:ctx.supplier.id,original_tx_id:invoice.id,return_reason_code:'supplier_return'}});mapping_bindings.push({key,binding_id:binding.id,binding_updated_date:binding.updated_date});return binding.account_id;};
 for(const item of items){
  const credits=original.lines.filter(l=>l.credit>0&&(!l.product_category||l.product_category===item.category_id)),payables=[...new Set(credits.map(l=>l.account_id))];
  requireValue(payables.length===1,'The original supplier payable cannot be identified unambiguously.',409);
  add(payables[0],item,item.credit,0);add(route(assetKey,item),item,0,item.stock_cost);
  const difference=Math.round((item.stock_cost-item.credit)*100)/100;
  if(difference)add(route(SUPPLIER_RETURN_VARIANCE,item),item,Math.max(difference,0),Math.max(-difference,0));
 }
 const lines=await checkedAccounts(ctx,c,raw,date),totals=validateLines(lines,c.currency_decimals);
 const accounts=await db.FinanceAccount.filter({company_id:c.id,id:{$in:lines.map(l=>l.account_id)}},{limit:100});
 requireValue(!accounts.has_more,'Too many return accounts.');
 for(let offset=0,i=0;i<items.length;i++){const count=items[i].credit===items[i].stock_cost?2:3,group=lines.slice(offset,offset+count);offset+=count;requireValue(accounts.items.find(a=>a.id===group[0].account_id)?.classification==='liabilities'&&accounts.items.find(a=>a.id===group[1].account_id)?.classification==='assets','Supplier returns require the original payable and an inventory asset.');if(count===3)requireValue(['cogs','operating_expenses','other_result'].includes(accounts.items.find(a=>a.id===group[2].account_id)?.classification),'Map purchase-return variance to a COGS, operating expense or other-result account.');}
 return {...values,items,lines,...totals,mapping_bindings,original_journal_id:original.id,invoice_snapshot:moduleSnapshot('PurchaseInvoice',invoice)};
}