import { branchQuery, financeBranch, financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { AUDIT_PAYMENT_CONDITIONS } from './financeAuditConditions.js';
import { CATERING_PAYMENT_TYPES, cateringPaymentKeys } from './financeCateringPaymentTypes.js';
import { financePaymentMethods } from './financePaymentMethods.js';
const label=value=>value==='instapay'?'InstaPay':value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export async function auditRoutingOptions(ctx,company,input){
 financePermission(ctx,'finance_accounts_manage');requireValue(ctx.admin||!ctx.permissions.branch_id,'Routing setup requires unrestricted company access.',403);
 requireValue(AUDIT_PAYMENT_CONDITIONS.includes(input.field),'Unsupported routing condition.');
 requireValue(!input.cursor||typeof input.cursor==='string'&&input.cursor.length<3000,'Invalid options cursor.');
 requireValue(!input.search||typeof input.search==='string'&&input.search.length<=80,'Search must be at most 80 characters.');
 if(input.branch_id)financeBranch(ctx,company,input.branch_id);
 if(input.field==='payment_method'){const page=await financePaymentMethods(ctx,company,{...input,action:'payment_methods'});return {...page,items:page.items.map(m=>({value:m.code,label:m.name+(m.is_active?'':' (inactive)')}))};}
 const values=input.field==='currency'?[company.currency]:input.field==='payment_type'?CATERING_PAYMENT_TYPES.filter(payment_type=>!input.mapping_key||cateringPaymentKeys({payment_type}).includes(input.mapping_key)):null;
 if(values)return {items:values.map(value=>({value,label:label(value)})),has_more:false};
 const search=String(input.search||'').trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),regex=search?{$regex:search,$options:'i'}:null,options={limit:25,sort:'-created_date',...(input.cursor?{cursor:input.cursor}:{})};
 if(input.field==='branch_id'){
  const page=await ctx.svc.entities.Branch.filter({id:{$in:company.branch_ids},...(regex?{name:regex}:{})},options);
  return {...page,items:page.items.map(b=>({value:b.id,label:b.name||b.id}))};
 }
 const query={...branchQuery(ctx,company),...(input.branch_id?{branch_id:input.branch_id}:{}),...(input.field==='event_id'&&input.customer_id?{client_id:input.customer_id}:{}),...(regex?input.field==='customer_id'?{client_name:regex}:{$or:[{event_name:regex},{event_code:regex},{client_name:regex}]}:{})};
 const page=await ctx.svc.entities.CateringEvent.filter(query,options);
 const items=page.items.map(e=>input.field==='customer_id'?{value:e.client_id,label:e.client_name||e.client_id}:{value:e.id,label:[e.event_code,e.event_name,e.event_date].filter(Boolean).join(' · ')||e.id}).filter(o=>o.value);
 return {...page,items:[...new Map(items.map(o=>[o.value,o])).values()]};
}