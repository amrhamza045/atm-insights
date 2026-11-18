import { financePermission } from './financeAccess.js';
import { financeBindings } from './financeBindings.js';
import { BINDING_CONDITIONS } from './financeBindingResolver.js';
import { requireValue, validDate } from './financeValidation.js';
import { PAYMENT_ACCOUNT_KEYS, PAYMENT_KEY_MESSAGE } from './financePaymentMethodSource.js';
export async function saveAuditBinding(ctx,company,data){
 financePermission(ctx,'finance_accounts_manage');
 requireValue(!PAYMENT_ACCOUNT_KEYS.includes(data.mapping_key),PAYMENT_KEY_MESSAGE,409);
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Account routing requires unrestricted company access.',403);
 const conditions=data.conditions||{},end=data.effective_to||'9999-12-31';
 requireValue(typeof conditions==='object'&&!Array.isArray(conditions)&&Object.entries(conditions).every(([k,v])=>BINDING_CONDITIONS.includes(k)&&typeof v==='string'&&v.trim()&&v.length<=120),'Invalid routing conditions.');
 requireValue(!conditions.branch_id||company.branch_ids.includes(conditions.branch_id),'Branch is outside this company.');
 requireValue(!conditions.currency||conditions.currency===company.currency,'Currency must match the company.');
 requireValue(validDate(data.effective_from)&&(!data.effective_to||validDate(data.effective_to)&&data.effective_to>=data.effective_from),'Choose valid effective from/to dates.');
 requireValue(!company.closed_through||data.effective_from>company.closed_through,'Cannot change routing in a closed period.');
 const account=await ctx.svc.entities.FinanceAccount.get(data.account_id);
 requireValue(account.company_id===company.id&&account.active&&account.posting&&account.management_mapping,'Select an active posting account in this company with reporting mappings.');
 const page=await ctx.svc.entities.FinanceAccountBinding.filter({company_id:company.id,mapping_key:data.mapping_key},{limit:500});
 requireValue(!page.has_more,'Too many account bindings to check safely. Narrow the account routing.');
 const overlaps=page.items.filter(b=>b.effective_from<=end&&data.effective_from<=(b.effective_to||'9999-12-31')&&!BINDING_CONDITIONS.some(k=>b.conditions?.[k]&&conditions[k]&&b.conditions[k]!==conditions[k]));
 const reusable=overlaps.find(b=>b.account_id===account.id&&b.effective_from<=data.effective_from&&(b.effective_to||'9999-12-31')>=end&&Object.entries(b.conditions||{}).every(([k,v])=>conditions[k]===v)&&!overlaps.some(other=>other.id!==b.id&&other.priority>=b.priority));
 if(reusable)return {binding:reusable,reused:true};
 requireValue(!overlaps.length,'Routing already exists for this key and overlapping conditions or dates. No duplicate was created. Review the existing binding in Mapping Accounts, or use a reviewed one-time journal if it does not cover the transaction date.',409);
 return await financeBindings(ctx,company,{action:'mapping_binding_save',data});
}