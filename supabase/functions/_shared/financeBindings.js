import { financePermission } from './financeAccess.js';
import { requireValue, validDate } from './financeValidation.js';
import { BINDING_CONDITIONS } from './financeBindingResolver.js';
import { assertUnusedBinding } from './financeBindingHistory.js';
import { validateInventoryBinding } from './inventoryAccountingConfiguration.js';
import { PAYMENT_ACCOUNT_KEYS, PAYMENT_KEY_MESSAGE } from './financePaymentMethodSource.js';
export async function financeBindings(ctx,company,input){
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Account routing requires unrestricted company access.',403);
 const entity=ctx.svc.entities.FinanceAccountBinding;
 if(input.action==='mapping_bindings'){
  const page=await entity.filter({company_id:company.id,...(input.mapping_key?{mapping_key:String(input.mapping_key)}:{})},{sort:'mapping_key',limit:25,...(input.cursor?{cursor:input.cursor}:{})});
  const ids=[...new Set(page.items.filter(b=>b.mapping_key.startsWith('INVENTORY_')||b.mapping_key==='TASTING_HOLDING_ACCOUNT').map(b=>b.conditions?.category).filter(Boolean))];
  const categories=ids.length?(await ctx.svc.entities.InventoryCategory.filter({id:{$in:ids}},{limit:25})).items:[];
  return {...page,items:page.items.map(b=>({...b,condition_labels:{category:categories.find(c=>c.id===b.conditions?.category)?.name||b.conditions?.category}}))};
 }
 financePermission(ctx,'finance_accounts_manage');
 let previous=null;if(input.id){previous=await entity.get(input.id);requireValue(previous.company_id===company.id,'Mapping is outside this company.',403);requireValue(previous.updated_date===input.expected_updated_date,'Mapping changed. Reload before saving.',409);}
 if(previous)await assertUnusedBinding(ctx,company,previous);
 if(input.action==='mapping_binding_delete'){
  requireValue(previous,'Select a mapping.');
  requireValue(!await ctx.svc.entities.FinanceMappingVersion.count({company_id:company.id,'lines.account_key':previous.mapping_key,status:{$in:['pending','approved']}}),'This key is used by pending or approved rules. Keep the binding for review and historical resolution.');
  await ctx.base44.asServiceRole.entities.FinanceAuditEvent.create({company_id:company.id,actor_id:ctx.user.id,actor_email:ctx.user.email,actor_type:'user',operation:input.action,action:'delete',entity_type:'FinanceAccountBinding',entity_id:previous.id,entity_label:previous.mapping_key,before:previous,after:{},changed_fields:['deleted'],request_id:ctx.auditRequestId});
  await entity.delete(previous.id);return {deleted:true};
 }
 const data=input.data||{},conditions=data.conditions||{};
 requireValue(/^(?:Cancellation_Customer|[A-Z][A-Z0-9_]{1,79})$/.test(data.mapping_key||''),'Use Cancellation_Customer or an uppercase semantic key, 2–80 letters, digits or underscores.');
 requireValue(!PAYMENT_ACCOUNT_KEYS.includes(data.mapping_key),PAYMENT_KEY_MESSAGE,409);
 requireValue(typeof conditions==='object'&&!Array.isArray(conditions)&&Object.keys(conditions).every(k=>BINDING_CONDITIONS.includes(k)),'Invalid routing conditions.');
 for(const [key,value] of Object.entries(conditions)){requireValue(typeof value==='string'&&value.trim()&&value.length<=120,'Use nonempty text conditions.');if(key==='branch_id')requireValue(company.branch_ids.includes(value),'Branch is outside this company.');if(key==='currency')requireValue(value===company.currency,'Currency must match the company.');}
 requireValue(validDate(data.effective_from)&&(!data.effective_to||validDate(data.effective_to)&&data.effective_to>=data.effective_from),'Choose valid effective from/to dates.');
 requireValue(!company.closed_through||data.effective_from>company.closed_through,'Cannot change routing in a closed period.');
 requireValue(Number.isInteger(data.priority)&&data.priority>=0&&data.priority<=1000,'Priority must be 0–1000.');
 requireValue(typeof data.account_id==='string'&&data.account_id.length>0&&data.account_id.length<=120,'Select an account.');
 const account=await ctx.svc.entities.FinanceAccount.get(data.account_id);
 requireValue(account.company_id===company.id&&account.active&&account.posting&&account.management_mapping,'Select an active posting account in this company with reporting mappings.');
 await validateInventoryBinding(ctx,company,data,account);
 const query={company_id:company.id,mapping_key:data.mapping_key,priority:data.priority};
 const peers=await entity.filter(query,{limit:500});requireValue(!peers.has_more,'Too many mappings for this priority.');
 requireValue(!peers.items.some(b=>b.id!==previous?.id&&!(data.mapping_key==='INVENTORY_CONTROL_ACCOUNT'&&b.inventory_stage&&data.inventory_stage&&b.inventory_stage!==data.inventory_stage)&&b.effective_from<=(data.effective_to||'9999-12-31')&&data.effective_from<=(b.effective_to||'9999-12-31')&&!BINDING_CONDITIONS.some(k=>b.conditions?.[k]&&conditions[k]&&b.conditions[k]!==conditions[k])),'Equal-priority mapping overlaps another binding. Change conditions, dates or priority.',409);
 if(previous)requireValue(!await ctx.svc.entities.FinanceMappingVersion.count({company_id:company.id,'lines.account_key':previous.mapping_key,status:{$in:['pending','approved']}}),'This binding is used by pending or approved rules. Add a higher-priority dated binding instead; history must remain unchanged.');
 const clean={...(data.mapping_key==='INVENTORY_CONTROL_ACCOUNT'?{inventory_stage:data.inventory_stage}:{}),company_id:company.id,mapping_key:data.mapping_key,account_id:account.id,account_code:account.code,account_name:account.name,conditions,priority:data.priority,effective_from:data.effective_from,effective_to:data.effective_to||'',notes:String(data.notes||'').slice(0,1000)};
 return {binding:previous?await entity.update(previous.id,clean):await entity.create(clean)};
}