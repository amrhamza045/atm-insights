import { requireValue, validDate } from './financeValidation.js';
import { resolveAccountBinding } from './financeBindingResolver.js';
import { buildModuleJournal } from './financeModuleRules.js';
import { PURCHASE_KEYS, purchaseMappingJournal } from './financeMappedPurchase.js';
import { CATERING_PAYMENT_REFERENCES, mappedCateringPayment, cateringPaymentKeys } from './financeCateringPaymentTypes.js';
import { auditPaymentContext } from './financeAuditConditions.js';
import { inventoryAuditMapping } from './financeAuditInventory.js';
import { methodFor } from './financePaymentMethodSource.js';

// Configuration is checked independently of posted/pending journals and historical
// locks. A one-time journal or captured snapshot is not a recurring routing rule.
export function auditMappingState(company,def,source,ops,context,today=new Date().toISOString().slice(0,10)){
 const date=String(source[def.date]||'').slice(0,10)>today?String(source[def.date]).slice(0,10):today;
 const result=(status,reason)=>({status,reason,checked_date:date});
 const account=(id,prefix)=>{
  const a=context.accounts.get(id);
  requireValue(a&&a.company_id===company.id&&a.active&&a.posting&&a.management_mapping,'Recurring routing needs an active company posting account with a reporting mapping.');
  requireValue((!a.effective_from||date>=a.effective_from)&&(!a.effective_to||date<=a.effective_to),'The routed account is not effective on the routing check date.');
  requireValue(!prefix||a.code?.startsWith(prefix),'The recurring mapping uses the wrong account classification.');
 };
 try{
  requireValue(validDate(date),'A valid routing check date is required.');
  requireValue(ops.length<=1,'Multiple operational journals reference this transaction; reconcile the source connection.');
  if(def.inventory)return inventoryAuditMapping(company,def,source,context,date,account,result);
  const op=ops[0],p=def.entity==='CateringPayment'?source:CATERING_PAYMENT_REFERENCES.includes(op?.reference_type)?context.payments.get(op.reference_id):null;
  if(mappedCateringPayment(p)){
   const keys=cateringPaymentKeys(p),semantic=p.payment_account_snapshot||context.bindings.some(b=>keys.includes(b.mapping_key))||!!methodFor(context.methods,p.payment_method);
   if(semantic||!op){
    requireValue(company.currency==='EGP','Catering automatic routing requires an EGP company.');
    const sample={date,dimensions:{...auditPaymentContext(company,p),channel:'catering'}};
    for(const key of keys){
     let id;
     // Cash and bank come from Payment methods (by code or older code).
     if(key==='PAYMENT_METHOD_ACC'){
      const method=methodFor(context.methods,p.payment_method);
      requireValue(method?.is_active,'Configure one active payment method for future matching payments.');id=method.account_id;
     }else id=resolveAccountBinding(context.bindings,key,sample).account_id;
     account(id,key==='PAYMENT_METHOD_ACC'?'1':key==='CUSTOMER_ADVANCE_ACC'?'2':'4');
    }
    if(!op)return result('unsupported','Account mappings exist, but this completed payment has no operational journal connection. Reconcile the source; saving routing alone cannot post it.');
    return result('ready','Reusable payment routing is configured; existing captured accounts remain unchanged.');
   }
  }
  if(op){
   if(op.reference_type==='catering_payment_void')return result('ready','Payment voids use the immutable original posting, not new account mappings.');
   requireValue(company.auto_post_enabled,'Automatic operational posting is disabled.');
   requireValue(company.auto_post_from&&date>=company.auto_post_from,'Operational routing is not yet effective.');
   requireValue(company.auto_source_currency===company.currency,'Confirm the automatic source currency.');
   requireValue(op.entries?.length>=2,'No complete operational account template is recorded.');
   for(const line of op.entries){const id=company.auto_account_map?.[line.gl_account_id];requireValue(id,`Missing recurring mapping for operational account ${line.account_number||line.gl_account_id}.`);account(id);}
   return result('ready','Reusable operational account routing is configured.');
  }
  if(['Order','PurchaseInvoice'].includes(def.entity)){
   const mapped=def.entity==='PurchaseInvoice'?purchaseMappingJournal(company,source,date,context.bindings,context.itemStages):null;
   if(!mapped){requireValue(company.module_policy?.enabled,'Sales / purchasing automatic connections are disabled.');requireValue(date>=company.module_policy.from,'Transaction routing is not yet effective.');}
   const built=mapped||buildModuleJournal(company,def.entity,source,date,{confirmedPaid:true,methods:context.methods});
   for(const line of built.lines)account(line.account_id,mapped?(line.debit>0?'1':'2'):undefined);
   return result('ready','Reusable transaction routing is configured; source evidence and historical recovery are checked separately.');
  }
  return result('unsupported','No live automatic source connection exists. Keep this exception open until a validated connection is implemented; a one-time journal does not define recurring routing.');
 }catch(error){if(![400,409].includes(error.status))throw error;return result('missing',error.message);}
}
export function auditQueueMatches(row,input){
 return (!input.status||input.status==='all'||row.status===input.status)&&(!input.mapping_status||input.mapping_status==='all'||(input.mapping_status==='exceptions'?row.mapping.status!=='ready'||row.status==='missing':input.mapping_status==='needs_mapping'?row.mapping.status!=='ready':row.mapping.status==='ready'));
}