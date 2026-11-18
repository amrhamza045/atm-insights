import { requireValue, validDate, validateLines } from './financeValidation.js';
import { resolveAccountBinding } from './financeBindingResolver.js';
import { buildModuleJournal } from './financeModuleRules.js';
import { PURCHASE_KEYS, purchaseMappingJournal, validatePurchaseAccounts } from './financeMappedPurchase.js';
import { inventoryItemStages } from './inventoryItemStages.js';
import { CATERING_PAYMENT_REFERENCES, mappedCateringPayment, cateringPaymentKeys } from './financeCateringPaymentTypes.js';
import { inventoryAuditContext } from './financeAuditInventory.js';
import { companyPaymentMethods, withPaymentMethods } from './financePaymentMethodSource.js';
export async function auditDiagnosticContext(ctx,company,def,sources,ops){
 const ids=[...new Set(ops.filter(s=>CATERING_PAYMENT_REFERENCES.includes(s.reference_type)).map(s=>s.reference_id).filter(Boolean))];
 const [payments,bindings]=await Promise.all([def.entity==='CateringPayment'?{items:sources}:ids.length?ctx.svc.entities.CateringPayment.filter({id:{$in:ids}},{limit:250}):{items:[]},(ops.length||['CateringPayment','PurchaseInvoice'].includes(def.entity))?ctx.svc.entities.FinanceAccountBinding.filter({company_id:company.id,mapping_key:{$in:['PAYMENT_METHOD_ACC','CUSTOMER_ADVANCE_ACC','Cancellation_Customer',...PURCHASE_KEYS,'INVENTORY_CONTROL_ACCOUNT']}},{limit:500}):{items:[]}]);
 requireValue(!payments.has_more&&!bindings.has_more,'Routing evidence exceeds this audit batch; narrow the source filters.');
 const stock=await inventoryAuditContext(ctx,company,def,sources);
 const purchaseItems=def.entity==='PurchaseInvoice'&&company.module_policy?.inventory?.enabled?await inventoryItemStages(ctx.svc.entities,bindings.items,sources.flatMap(s=>(s.items||[]).map(it=>({inventory_item_id:it.inventory_item_id,category_id:it.category_id}))),{date:new Date().toISOString().slice(0,10),dimensions:{currency:company.currency}}):[];
 const itemStages=new Map(purchaseItems.filter(it=>it.inventory_stage).map(it=>[it.inventory_item_id,it.inventory_stage]));
 // Every method, so older codes on historical payments resolve too.
 const methods={items:await companyPaymentMethods(ctx.svc.entities,company)};
 const accountIds=[...new Set([...Object.values(company.auto_account_map||{}),...Object.values(company.module_policy?.map||{}),...bindings.items.map(b=>b.account_id),...methods.items.map(m=>m.account_id),...payments.items.flatMap(p=>(p.payment_account_snapshot?.accounts||[]).map(a=>a.account_id)),...(stock.stockBindings||[]).map(b=>b.account_id),...(stock.reasons?[...stock.reasons.values()].map(r=>r.account_id):[])])];
 const accounts=accountIds.length?await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:accountIds}},{limit:500}):{items:[]};requireValue(!accounts.has_more,'Too many accounts for a safe routing audit.');
 return {payments:new Map(payments.items.map(p=>[p.id,p])),bindings:withPaymentMethods(bindings.items,methods.items),methods:methods.items,accounts:new Map(accounts.items.map(a=>[a.id,a])),itemStages,...stock};
}
function accountsValid(ctx,lines,date){
 for(const line of lines){const a=ctx.accounts.get(line.account_id);requireValue(a&&a.active&&a.posting,'Routing needs an active posting account in this company.');requireValue(a.management_mapping,`Account ${a.code} needs a reporting mapping.`);requireValue((!a.effective_from||date>=a.effective_from)&&(!a.effective_to||date<=a.effective_to),`Account ${a.code} is not effective on the transaction date.`);}
}
export function currentAuditBlocker(company,def,s,ops,context){
 try{
  requireValue(ops.length<=1,'Multiple operational journals reference this transaction; reconcile duplicates.');
  const op=ops[0];
  if(!op&&def.inventory)return 'No posting attempt is recorded yet; it posts automatically when the waste is approved or the event is closed.';
  if(!op&&!['Order','PurchaseInvoice'].includes(def.entity))return def.entity==='CateringPayment'?'No operational journal exists for this completed payment.':'No live posting adapter is connected for this direct source.';
  const date=String(op?.entry_date||s[def.date]||'').slice(0,10);requireValue(validDate(date),'No valid transaction accounting date is recorded.');requireValue(!company.closed_through||date>company.closed_through,`Posting is locked through ${company.closed_through}.`);
  if(op){
   const p=context.payments.get(op.reference_id),semantic=CATERING_PAYMENT_REFERENCES.includes(op.reference_type)&&mappedCateringPayment(p);
   const keys=semantic?cateringPaymentKeys(p):[];
   if(keys.length&&(p.payment_account_snapshot||context.bindings.some(b=>keys.includes(b.mapping_key)))){
    requireValue(p.status==='completed','Only completed catering payments can post.');requireValue(company.currency==='EGP','Catering source currency is EGP.');requireValue(p.payment_type==='penalty'||p.payment_method,'A recorded payment method is required for receipt or refund routing.');
    const sample={date:String(p.payment_date||'').slice(0,10),dimensions:{branch_id:p.branch_id,event_id:p.event_id,customer_id:p.client_id,currency:company.currency,channel:'catering',payment_method:p.payment_method}};
    if(p.payment_account_snapshot)requireValue(p.payment_account_snapshot.company_id===company.id,'Payment snapshot belongs to a different company.');
    const lines=keys.map(key=>({account_id:p.payment_account_snapshot?p.payment_account_snapshot.accounts?.find(a=>a.account_key===key)?.account_id:resolveAccountBinding(context.bindings,key,sample).account_id}));accountsValid(context,lines,date);
    return 'No recorded posting failure. Current account routing is available; inspect the full source validation before recovery.';
   }
   requireValue(company.auto_post_enabled,'Automatic operational journal posting is disabled and no live semantic mapping applies.');requireValue(date>=company.auto_post_from,'Before the automatic operational posting start date.');requireValue(company.auto_source_currency===company.currency,'Source currency must match company currency.');
   const lines=(op.entries||[]).map(l=>{const id=company.auto_account_map?.[l.gl_account_id];requireValue(id,`Missing account mapping for operational account ${l.account_number||l.gl_account_id}.`);return {account_id:id,debit:l.debit||0,credit:l.credit||0,cost_center:s.branch_id};});validateLines(lines,company.currency_decimals);accountsValid(context,lines,date);
  }else{
   const mapped=def.entity==='PurchaseInvoice'?purchaseMappingJournal(company,s,date,context.bindings,context.itemStages):null;
       if(!mapped){requireValue(company.module_policy?.enabled,'Sales / purchasing transaction connections are disabled.');requireValue(date>=company.module_policy.from,'Before the transaction connection start date.');}
       const built=mapped||buildModuleJournal(company,def.entity,s,date,{confirmedPaid:false,methods:context.methods});validateLines(built.lines,company.currency_decimals);accountsValid(context,built.lines,date);
       validatePurchaseAccounts(built,built.lines.map(l=>({...l,account_code:context.accounts.get(l.account_id).code})));
   if(def.entity==='Order')return 'Current collection routing is available, but the original payment date and evidence must be confirmed before a recovery run.';
  }
  return 'No recorded posting failure. Current routing is available; inspect full validation and explicitly confirm recovery.';
 }catch(error){if(![400,409].includes(error.status))throw error;return error.message;}
}