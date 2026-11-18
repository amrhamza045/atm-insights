import { financePermission, financeBranch } from './financeAccess.js';
import { configureFinanceAutomatic } from './financeAutomatic.js';
import { saveAuditBinding } from './financeAuditBinding.js';
import { inspectTransactionAudit } from './financeTransactionAudit.js';
import { requireValue } from './financeValidation.js';
import { validateAuditConditions } from './financeAuditConditions.js';
export async function saveTransactionRouting(ctx,company,input){
 financePermission(ctx,'finance_journal_approve');requireValue(ctx.admin||!ctx.permissions.branch_id,'Routing setup requires unrestricted company access.',403);
 requireValue(input.confirmed===true,'Confirm this routing can affect future transactions.');
 const detail=await inspectTransactionAudit(ctx,company,input);
 if(detail.routing.kind==='purchase'){
  financePermission(ctx,'finance_accounts_manage');const data=input.data||{},conditions=data.conditions||{};
  requireValue(detail.routing.keys.includes(data.mapping_key),'Choose an inventory or supplier-payable routing key.');
  requireValue(conditions&&typeof conditions==='object'&&!Array.isArray(conditions)&&Object.entries(conditions).every(([k,v])=>detail.routing.condition_fields.includes(k)&&typeof v==='string'&&v.trim()&&v.length<=120),'Choose supported invoice routing conditions.');
  if(conditions.branch_id)financeBranch(ctx,company,conditions.branch_id);
  requireValue(!conditions.currency||conditions.currency===company.currency,'Currency must match the company.');
  if(conditions.category)requireValue(await ctx.svc.entities.InventoryCategory.count({id:conditions.category})>0,'Choose an existing inventory category.');
  requireValue(Number.isInteger(data.priority)&&data.priority>=0&&data.priority<=1000,'Priority must be 0–1000.');
  const account=await ctx.svc.entities.FinanceAccount.get(data.account_id);
  requireValue(account.code?.startsWith(['RAW_INV_ACCOUNT','INVENTORY_CONTROL_ACCOUNT'].includes(data.mapping_key)?'1':'2'),'Inventory must use an asset account and supplier payables a liability account.');
  const result=await saveAuditBinding(ctx,company,data),updated=await inspectTransactionAudit(ctx,company,input);
  return {...result,mapping:updated.mapping,message:(result.reused?'Existing routing reused.':'Recurring invoice routing saved.')+' Configure both keys; existing journals and pending proposals are unchanged. Historical recovery requires a separate confirmed preview.'};
 }
 if(detail.routing.kind==='semantic'){
  financePermission(ctx,'finance_accounts_manage');requireValue(detail.routing.keys.includes(input.data?.mapping_key),'This mapping key is not part of the suggested routing.');
  await validateAuditConditions(ctx,company,input.data);
  requireValue(Number.isInteger(input.data.priority)&&input.data.priority>=0&&input.data.priority<=1000,'Priority must be 0–1000.');
  const account=await ctx.svc.entities.FinanceAccount.get(input.data.account_id),prefix=input.data.mapping_key==='PAYMENT_METHOD_ACC'?'1':input.data.mapping_key==='CUSTOMER_ADVANCE_ACC'?'2':'4';
  requireValue(account.code?.startsWith(prefix),'Choose an asset account for payment methods, a liability account for customer advances, or a revenue account for cancellation fees.');
  const result=await saveAuditBinding(ctx,company,input.data),updated=await inspectTransactionAudit(ctx,company,input);
  const matches_source=input.data.effective_from<=detail.source_date&&(!input.data.effective_to||input.data.effective_to>=detail.source_date)&&Object.entries(input.data.conditions||{}).every(([k,v])=>detail.routing.context[k]===v);
  return {...result,preview:updated.preview,matches_source,message:(result.reused?'Existing routing reused. No new binding created.':'Future automatic routing saved.')+(matches_source?'':' This rule does not match the selected transaction; it applies only to future matching transactions.')+' Posted journals and pending proposals are unchanged.',reason:updated.reason};
 }
 // Saving a recurring map must remain possible after a one-time journal.
 // Recovery retains its separate posted/pending duplicate guards.
 requireValue(detail.routing.kind==='operational','Use sales / purchasing connection settings for this source.');
 const permitted=new Set(detail.routing.accounts.map(a=>a.id));requireValue(input.account_map&&Object.keys(input.account_map).every(k=>permitted.has(k)),'Only this source’s operational accounts may be changed here.');
 return await configureFinanceAutomatic(ctx,company,{enabled:true,confirmed:true,from:input.from,source_currency:company.currency,account_map:{...company.auto_account_map,...input.account_map}});
}