import test from 'node:test';
import assert from 'node:assert/strict';
import { auditRoutingOptions } from './financeAuditOptions.js';
const company={id:'co',branch_ids:['branch'],currency:'EGP'};
function fixture(){
 const calls=[];const ctx={admin:true,permissions:{},svc:{entities:{Branch:{filter:async(q,o)=>{calls.push({q,o});return {items:[{id:'branch',name:'Company branch',secret:'never return'}],has_more:true,next_cursor:'next'};}},CateringEvent:{filter:async(q,o)=>{calls.push({q,o});return {items:[{id:'event',client_id:'customer',client_name:'Customer',event_name:'Occasion',private_notes:'never return'},{id:'another',client_id:'customer',client_name:'Customer'}],has_more:true,next_cursor:'next'};}}}}};return {ctx,calls};
}
test('payment options reflect company master data and key eligibility',async()=>{
 const f=fixture();f.ctx.svc.entities.FinancePaymentMethod={filter:async q=>{assert.equal(q.company_id,company.id);return {items:[{code:'custom_bank',name:'Custom bank',is_active:true}],has_more:false};}};
 assert.deepEqual((await auditRoutingOptions(f.ctx,company,{field:'payment_method'})).items,[{value:'custom_bank',label:'Custom bank'}]);
 assert.deepEqual((await auditRoutingOptions(f.ctx,company,{field:'payment_type',mapping_key:'Cancellation_Customer'})).items.map(i=>i.value),['penalty']);
 assert.equal(f.calls.length,0);
});
test('customer choices are company-scoped, paginated, deduplicated and minimal',async()=>{
 const f=fixture(),r=await auditRoutingOptions(f.ctx,company,{field:'customer_id',search:'Customer',cursor:'previous'});
 assert.deepEqual(f.calls[0].q.branch_id,{$in:['branch']});assert.equal(f.calls[0].o.cursor,'previous');assert.equal(f.calls[0].o.limit,25);assert.equal(r.next_cursor,'next');assert.deepEqual(r.items,[{value:'customer',label:'Customer'}]);
});
test('branch and event choices never query another company',async()=>{
 const f=fixture(),b=await auditRoutingOptions(f.ctx,company,{field:'branch_id'});assert.deepEqual(f.calls[0].q.id,{$in:['branch']});assert.deepEqual(b.items,[{value:'branch',label:'Company branch'}]);
 await auditRoutingOptions(f.ctx,company,{field:'event_id',branch_id:'branch',customer_id:'customer'});assert.equal(f.calls[1].q.branch_id,'branch');assert.equal(f.calls[1].q.client_id,'customer');
 await assert.rejects(()=>auditRoutingOptions(f.ctx,company,{field:'event_id',branch_id:'foreign'}));
});
test('options require account management and reject unsupported fields and untrusted search',async()=>{
 const f=fixture();f.ctx.admin=false;await assert.rejects(()=>auditRoutingOptions(f.ctx,company,{field:'customer_id'}),/Permission/);f.ctx.admin=true;
 for(const input of [{field:'warehouse'},{field:'customer_id',search:{$ne:''}},{field:'customer_id',search:'x'.repeat(81)}])await assert.rejects(()=>auditRoutingOptions(f.ctx,company,input));
});