import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { paymentMethodAccount, paymentMethodHasHistory, paymentCodesHaveHistory } from './financePaymentMethodRules.js';
import { methodCodes } from './financePaymentMethodSource.js';
const CODE=/^[a-z][a-z0-9_]{0,79}$/;
// Older codes typed as a list or comma-separated text, normalized like method codes.
function olderCodes(value,code){
 const list=[...new Set((Array.isArray(value)?value:String(value||'').split(',')).map(c=>String(c).trim().toLowerCase()).filter(Boolean))];
 requireValue(list.length<=10&&list.every(c=>CODE.test(c)&&c!==code),'Older codes start with a letter, use letters, numbers or underscores, differ from the method code, and are at most 10.');
 return list;
}
export async function financePaymentMethods(ctx,company,input){
 const entity=ctx.svc.entities.FinancePaymentMethod;
 requireValue(!input.search||typeof input.search==='string'&&input.search.length<=80,'Search must be at most 80 characters.');
 requireValue(!input.cursor||typeof input.cursor==='string'&&input.cursor.length<3000,'Invalid cursor.');
 if(input.action==='payment_methods'){
  const search=String(input.search||'').trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return entity.filter({company_id:company.id,...(input.active_only?{is_active:true}:{}),...(search?{$or:[{name:{$regex:search,$options:'i'}},{code:{$regex:search,$options:'i'}}]}:{})},{sort:'name',limit:25,...(input.cursor?{cursor:input.cursor}:{})});
 }
 financePermission(ctx,'finance_accounts_manage');
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Payment-method configuration requires unrestricted company access.',403);
 const previous=input.id?await entity.get(input.id):null;
 if(previous){requireValue(previous.company_id===company.id,'Payment method is outside this company.',403);requireValue(previous.updated_date===input.expected_updated_date,'Payment method changed. Reload before saving.',409);}
 if(input.action==='payment_method_delete'){
  requireValue(previous,'Select a payment method.');
  requireValue(!await paymentMethodHasHistory(ctx,company,previous),'This payment method has historical transactions or accounting links and cannot be deleted. Deactivate it instead to preserve your records.',409);
  requireValue(previous.is_active===false,'Deactivate this unused method before deleting it.');
  await ctx.base44.asServiceRole.entities.FinanceAuditEvent.create({company_id:company.id,actor_id:ctx.user.id,actor_email:ctx.user.email,actor_type:'user',operation:input.action,action:'delete',entity_type:'FinancePaymentMethod',entity_id:previous.id,entity_label:previous.name,before:previous,after:{},changed_fields:['deleted'],request_id:ctx.auditRequestId});
  await entity.delete(previous.id);return {deleted:true};
 }
 if(input.action==='payment_method_toggle'){
  requireValue(previous&&typeof input.is_active==='boolean','Choose a payment method and active state.');
  requireValue(input.is_active||!previous.is_default,'This is the default payment method. Mark another method as the default before deactivating it.',409);
  if(input.is_active)paymentMethodAccount(company,await ctx.svc.entities.FinanceAccount.get(previous.account_id));
  return {method:await entity.update(previous.id,{is_active:input.is_active})};
 }
 requireValue(input.action==='payment_method_save','Unknown payment-method action.');
 const data=input.data||{},code=String(data.code||'').trim().toLowerCase(),name=String(data.name||'').trim();
 requireValue(CODE.test(code),'Use a stable code starting with a letter, followed by letters, numbers or underscores.');
 requireValue(name.length>0&&name.length<=120,'Enter a name up to 120 characters.');
 requireValue(!previous||previous.code===code,'Method codes cannot be changed; create a new method instead.');
 requireValue(typeof data.account_id==='string'&&data.account_id,'Select a clearing or cash account.');
 const legacy=olderCodes(data.legacy_codes,code),isDefault=data.is_default===true;
 const others=(await entity.filter({company_id:company.id},{limit:200})).items.filter(m=>m.id!==previous?.id),taken=new Set(others.flatMap(methodCodes));
 requireValue(!taken.has(code),'That method code already exists in this company, as a code or an older code.',409);
 const clash=legacy.find(c=>taken.has(c));requireValue(!clash,`Older code "${clash}" already belongs to another payment method.`,409);
 const removed=(previous?.legacy_codes||[]).filter(c=>!legacy.includes(c));
 requireValue(!removed.length||!await paymentCodesHaveHistory(ctx,company,removed),`Older code ${removed.join(', ')} is on recorded transactions and must stay on this method.`,409);
 requireValue(isDefault||!previous?.is_default,'This is the default payment method. Mark another method as the default instead.',409);
 requireValue(!isDefault||previous?.is_active!==false,'Activate this method before making it the default.');
 const account=await ctx.svc.entities.FinanceAccount.get(data.account_id);paymentMethodAccount(company,account);
 const clean={company_id:company.id,method_key:`${company.id}:${code}`,code,name,account_id:account.id,account_code:account.code,account_name:account.name,legacy_codes:legacy,is_default:isDefault};
 const method=previous?await entity.update(previous.id,clean):await entity.create({...clean,is_active:true,has_transactions:false});
 // One default per company.
 if(isDefault)await Promise.all(others.filter(m=>m.is_default).map(m=>entity.update(m.id,{is_default:false})));
 return {method};
}