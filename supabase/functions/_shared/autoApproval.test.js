import test from 'node:test';
import assert from 'node:assert/strict';
import { canSelfApprove } from './autoApproval.js';
import { guardOwnPayment } from './cateringPaymentReviewAccess.js';
const svc=(on,bypass=false)=>({entities:{
 SystemSettings:{filter:async()=>[{auto_approve_with_permission:on}]},
 UserPermissions:{filter:async()=>[{user_email:'me@x.com',role:'r1'}]},
 Role:{filter:async()=>[{role_key:'r1',permissions:{approval_self_bypass:bypass}}]},
}});
const me={id:'u1',email:'me@x.com'};
const ctx=(perms,on=true,bypass=false)=>({user:me,central:false,permissions:perms,svc:svc(on,bypass)});
const own={recorded_by_id:'u1',recorded_by:'Me@x.com'};
test('self-approval needs the approval permission and the switch',async()=>{
 assert.equal(await canSelfApprove(svc(true),false,{catering_finance:true},'catering_payment_approve'),false);
 assert.equal(await canSelfApprove(svc(true),false,{catering_payment_approve:true},'catering_payment_approve'),true);
 assert.equal(await canSelfApprove(svc(false),false,{catering_payment_approve:true},'catering_payment_approve'),false);
 assert.equal(await canSelfApprove(svc(true),false,{catering_payment_approve:true,access_denied:true},'catering_payment_approve'),false);
 assert.equal(await canSelfApprove(svc(true),true,{},'deposit_withdrawal_approve'),true);
});
test('Self-approve works with the switch off, but still needs the approval permission',async()=>{
 assert.equal(await canSelfApprove(svc(false,true),false,{catering_payment_approve:true},'catering_payment_approve',me),true);
 assert.equal(await canSelfApprove(svc(false,true),false,{catering_finance:true},'catering_payment_approve',me),false);
 assert.equal(await canSelfApprove(svc(false,false),true,{},'catering_payment_approve',me),false);
});
test('own payments: approvers decide them, recorders without approval wait for another user',async()=>{
 await guardOwnPayment(ctx({catering_payment_approve:true}),own,'blocked');
 await assert.rejects(guardOwnPayment(ctx({catering_finance:true}),own,'blocked'),e=>e.status===403);
 await assert.rejects(guardOwnPayment(ctx({catering_payment_approve:true},false),own,'blocked'),e=>e.status===403);
 assert.equal(await guardOwnPayment(ctx({catering_payment_approve:true},false,true),own,'blocked'),'bypass');
 await guardOwnPayment(ctx({catering_finance:true}),{recorded_by_id:'u2',recorded_by:'other@x.com'},'blocked');
});