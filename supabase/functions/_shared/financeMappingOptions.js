import { financePermission, financeBranch, branchQuery } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { BINDING_CONDITIONS } from './financeBindingResolver.js';
import { AUDIT_PAYMENT_CONDITIONS } from './financeAuditConditions.js';
import { auditRoutingOptions } from './financeAuditOptions.js';
export async function mappingConditionOptions(ctx,company,input){
 financePermission(ctx,'finance_accounts_manage');requireValue(ctx.admin||!ctx.permissions.branch_id,'Routing setup requires unrestricted company access.',403);
 requireValue([...BINDING_CONDITIONS,'mapping_key'].includes(input.field),'Unsupported mapping condition.');
 requireValue(!input.search||typeof input.search==='string'&&input.search.length<=80,'Search must be at most 80 characters.');
 requireValue(!input.cursor||typeof input.cursor==='string'&&input.cursor.length<3000,'Invalid options cursor.');
 if(input.branch_id)financeBranch(ctx,company,input.branch_id);
 if(AUDIT_PAYMENT_CONDITIONS.includes(input.field))return auditRoutingOptions(ctx,company,{...input,mapping_key:['PAYMENT_METHOD_ACC','CUSTOMER_ADVANCE_ACC','Cancellation_Customer'].includes(input.mapping_key)?input.mapping_key:undefined});
 const regex=input.search?{$regex:input.search.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}:null;
 const branch=input.branch_id?{branch_id:input.branch_id}:branchQuery(ctx,company);
 const sources={category:['InventoryCategory',{$or:[branch,{branch_id:{$exists:false}},{branch_id:null},{branch_id:''}],is_active:{$ne:false}},'id','name'],warehouse:['StorageLocation',{...branch,is_active:{$ne:false}},'id','name'],bank_cash_id:['FinanceAccount',{company_id:company.id,active:true,posting:true,classification:'assets'},'id','name'],event_type_id:['CateringOption',{list_type:'event_type',is_active:{$ne:false}},'id','name'],service_type_id:['CateringOption',{list_type:'service_style',is_active:{$ne:false}},'id','name'],tax_profile:['FinanceTaxRule',{company_id:company.id},'code','name']};
 const source=sources[input.field],field=input.field==='mapping_key'?'mapping_key':`conditions.${input.field}`;
 const [entity,query,valueKey,labelKey]=source||['FinanceAccountBinding',{company_id:company.id,[field]:{$exists:true}},field,field];
 const page=await ctx.svc.entities[entity].filter({...query,...(regex?{[labelKey]:regex}:{})},{sort:'-created_date',limit:25,...(input.cursor?{cursor:input.cursor}:{})});
 const get=(r,key)=>key.split('.').reduce((v,k)=>v?.[k],r);
 const items=page.items.map(r=>({value:get(r,valueKey),label:get(r,labelKey)})).filter(o=>typeof o.value==='string'&&o.value).map(o=>({...o,label:o.label||o.value}));
 return {items:[...new Map(items.map(o=>[o.value,o])).values()],has_more:page.has_more,next_cursor:page.next_cursor};
}