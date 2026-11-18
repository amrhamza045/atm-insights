import test from 'node:test';
import assert from 'node:assert/strict';
import { saveTransactionRouting } from './financeTransactionRouting.js';
import { listTransactionAudit } from './financeTransactionAudit.js';
import { recoverTransaction } from './financeTransactionRecovery.js';
function fixture(){
 const company={id:'co',branch_ids:['b'],currency:'EGP',currency_decimals:2},bindings=[],journals=[{id:'one-time',status:'posted',ledger_ready:true,source_entity:'PurchaseInvoice',source_id:'inv',lines:[]}];
 const invoice={id:'inv',branch_id:'b',status:'posted',supplier_id:'vendor',invoice_date:'2026-01-01',total_amount:100,items:[{inventory_item_id:'item',quantity:1,purchase_price:100,total_cost:100}]};
 const accounts=[{id:'asset',company_id:'co',code:'110100',active:true,posting:true,management_mapping:'inventory'},{id:'liability',company_id:'co',code:'210100',active:true,posting:true,management_mapping:'payable'}];
 const entities={PurchaseOrder:{filter:async()=>({items:[]})},PurchaseInvoice:{get:async()=>invoice,filter:async()=>({items:[invoice]})},JournalEntry:{filter:async()=>({items:[]})},FinanceJournal:{filter:async()=>({items:journals})},FinanceProposal:{filter:async()=>({items:[]})},FinancePostingIssue:{filter:async()=>({items:[]})},FinanceAccount:{get:async id=>accounts.find(a=>a.id===id),filter:async q=>({items:accounts.filter(a=>q.id.$in.includes(a.id))})},FinanceAccountBinding:{filter:async q=>({items:bindings.filter(b=>typeof q.mapping_key==='string'?b.mapping_key===q.mapping_key:q.mapping_key.$in.includes(b.mapping_key))}),create:async d=>{const b={id:`binding-${bindings.length}`,...d};bindings.push(b);return b;}}};
 return {company,bindings,journals,ctx:{admin:true,permissions:{},svc:{entities}},input:{source_entity:'PurchaseInvoice',source_id:'inv',confirmed:true}};
}
test('posted one-time invoices remain in the mapping queue until both recurring keys are saved',async()=>{
 const f=fixture(),query={source_entity:'PurchaseInvoice',status:'all',mapping_status:'exceptions'};
 assert.equal((await listTransactionAudit(f.ctx,f.company,query)).items.length,1);
 const before=structuredClone(f.journals),save=(mapping_key,account_id)=>saveTransactionRouting(f.ctx,f.company,{...f.input,data:{mapping_key,account_id,effective_from:'2026-01-01',effective_to:'',priority:100,conditions:{branch_id:'b'}}});
 await save('RAW_INV_ACCOUNT','asset');
 assert.equal((await listTransactionAudit(f.ctx,f.company,query)).items.length,1);
 const result=await save('VENDOR_AP_ACCOUNT','liability');assert.equal(result.mapping.status,'ready');
 assert.equal((await listTransactionAudit(f.ctx,f.company,query)).items.length,0);
 assert.deepEqual(f.journals,before);assert.equal(f.bindings.length,2);
 await assert.rejects(()=>recoverTransaction(f.ctx,f.company,{...f.input,reason:'Duplicate recovery'}),/already represents/);
});
test('routing still requires approval, valid keys, matching classification and unrestricted company permission',async()=>{
 const f=fixture(),data={mapping_key:'RAW_INV_ACCOUNT',account_id:'liability',effective_from:'2026-01-01',priority:100,conditions:{}};
 await assert.rejects(()=>saveTransactionRouting(f.ctx,f.company,{...f.input,confirmed:false,data}),/Confirm/);
 await assert.rejects(()=>saveTransactionRouting(f.ctx,f.company,{...f.input,data}),/asset account/);
 await assert.rejects(()=>saveTransactionRouting({...f.ctx,admin:false,permissions:{finance_journal_approve:true,branch_id:'b'}},f.company,{...f.input,data}),/unrestricted/);
 assert.equal(f.bindings.length,0);
});