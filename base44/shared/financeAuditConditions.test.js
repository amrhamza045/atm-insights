import test from 'node:test';
import assert from 'node:assert/strict';
import { auditPaymentContext, validateAuditConditions } from './financeAuditConditions.js';
import { loadRecoveryAdvance } from './financeRecoverySource.js';
import { resolveAccountBinding } from './financeBindingResolver.js';
const company={id:'co',branch_ids:['branch'],currency:'EGP',currency_decimals:2};
const payment={id:'pay',branch_id:'branch',event_id:'event',client_id:'customer',payment_method:'instapay',payment_type:'refund',status:'completed',amount:50,payment_date:'2026-11-05',updated_date:'v1'};
const ctx={admin:true,permissions:{},svc:{entities:{FinancePaymentMethod:{count:async q=>['cash','instapay'].includes(q.code)?1:0},CateringPayment:{get:async()=>payment},CateringEvent:{get:async()=>({branch_id:'branch',client_id:'customer'}),count:async q=>q.id==='foreign'||q.client_id==='foreign'?0:1}}}};
test('audit exposes exactly the dimensions the live payment supplies',async()=>{
 const context=auditPaymentContext(company,payment),source=await loadRecoveryAdvance(ctx,company,'pay',{includeOutgoing:true});
 for(const [key,value] of Object.entries(context))assert.equal(source.sample.dimensions[key],value,key);
 assert.equal(context.payment_type,'refund');assert.equal(context.customer_id,'customer');
 const rule={mapping_key:'PAYMENT_METHOD_ACC',conditions:{payment_type:'refund',customer_id:'customer',payment_method:'instapay'},priority:100,effective_from:'2026-11-05',effective_to:'2026-12-31'};
 assert.equal(resolveAccountBinding([rule],rule.mapping_key,source.sample),rule);
 assert.throws(()=>resolveAccountBinding([rule],rule.mapping_key,{...source.sample,dimensions:{...source.sample.dimensions,payment_type:'deposit'}}),/Missing/);
});
test('audit validates source-supported conditions and company boundaries',async()=>{
 await validateAuditConditions(ctx,company,{mapping_key:'PAYMENT_METHOD_ACC',conditions:{payment_method:'cash',payment_type:'refund',customer_id:'customer',event_id:'event'}});
 for(const conditions of [{warehouse:'w'},{branch_id:'foreign'},{currency:'USD'},{payment_method:'invented'},{payment_type:'invented'},{customer_id:'foreign'},{event_id:'foreign'},{payment_method:{$ne:'cash'}}])await assert.rejects(()=>validateAuditConditions(ctx,company,{mapping_key:'PAYMENT_METHOD_ACC',conditions}));
});
test('rules cannot use a payment type that never uses their account key',async()=>{
 await assert.rejects(()=>validateAuditConditions(ctx,company,{mapping_key:'Cancellation_Customer',conditions:{payment_type:'refund'}}),/payment type/);
 await assert.rejects(()=>validateAuditConditions(ctx,company,{mapping_key:'PAYMENT_METHOD_ACC',conditions:{payment_type:'penalty'}}),/payment type/);
 await validateAuditConditions(ctx,company,{mapping_key:'Cancellation_Customer',conditions:{payment_type:'penalty'}});
});