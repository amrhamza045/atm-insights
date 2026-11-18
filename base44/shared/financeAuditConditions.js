import { branchQuery, financeBranch } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { cateringPaymentKeys, CATERING_PAYMENT_TYPES } from './financeCateringPaymentTypes.js';
export const AUDIT_PAYMENT_CONDITIONS=['payment_method','branch_id','currency','payment_type','customer_id','event_id'];
export function auditPaymentContext(company,payment){
 return {branch_id:payment.branch_id,currency:company.currency,payment_type:payment.payment_type,customer_id:payment.client_id,event_id:payment.event_id,...(payment.payment_method?{payment_method:payment.payment_method}:{})};
}
export async function validateAuditConditions(ctx,company,data){
 const conditions=data.conditions||{};
 requireValue(typeof conditions==='object'&&!Array.isArray(conditions)&&Object.entries(conditions).every(([k,v])=>AUDIT_PAYMENT_CONDITIONS.includes(k)&&typeof v==='string'&&v.trim()&&v.length<=120),'Choose source-supported, nonempty routing conditions.');
 if(conditions.branch_id)financeBranch(ctx,company,conditions.branch_id);
 requireValue(!conditions.currency||conditions.currency===company.currency,'Currency must match the company.');
 if(conditions.payment_method)requireValue(await ctx.svc.entities.FinancePaymentMethod.count({company_id:company.id,code:conditions.payment_method})>0,'Choose a payment method configured for this company.');
 requireValue(!conditions.payment_type||CATERING_PAYMENT_TYPES.includes(conditions.payment_type)&&cateringPaymentKeys({payment_type:conditions.payment_type}).includes(data.mapping_key),'This payment type does not use the selected account key.');
 if(conditions.event_id||conditions.customer_id){
  const query={...branchQuery(ctx,company),...(conditions.branch_id?{branch_id:conditions.branch_id}:{}),...(conditions.event_id?{id:conditions.event_id}:{}),...(conditions.customer_id?{client_id:conditions.customer_id}:{})};
  requireValue(await ctx.svc.entities.CateringEvent.count(query)>0,'The selected event/customer must belong together within the selected company and branch.');
 }
}