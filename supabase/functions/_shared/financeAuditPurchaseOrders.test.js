import test from 'node:test';
import assert from 'node:assert/strict';
import { listTransactionAudit } from './financeTransactionAudit.js';
const invoice={id:'inv',invoice_number:'GMO-260065',branch_id:'branch',status:'posted',supplier_id:'supplier',invoice_date:'2026-10-21',total_amount:93070.36,items:[{inventory_item_id:'item',quantity:1,purchase_price:93070.36,total_cost:93070.36}]};
function fixture(){
 const company={id:'co',branch_ids:['branch'],currency:'EGP',currency_decimals:2,module_policy:{enabled:true,from:'2026-01-01',map:{inventory:'asset',suppliers:'liability'}}};
 const journal={id:'posted',source_entity:'PurchaseInvoice',source_id:'inv',status:'posted',ledger_ready:true,lines:[]};
 const orders=[{id:'po',order_number:'PO-REG-1021-EL-GOMHOREYA-0282',purchase_recorded_invoice_id:'inv',branch_id:'branch',supplier_contact:'private'}],calls=[];
 const entities={PurchaseInvoice:{filter:async()=>({items:[invoice]})},PurchaseOrder:{filter:async(q,o)=>{calls.push({q,o});return {items:orders};}},JournalEntry:{filter:async()=>({items:[]})},FinanceJournal:{filter:async()=>({items:[journal]})},FinanceProposal:{filter:async()=>({items:[]})},FinancePostingIssue:{filter:async()=>({items:[]})},FinanceAccountBinding:{filter:async()=>({items:[]})},FinanceAccount:{filter:async()=>({items:[{id:'asset',company_id:'co',code:'112100',active:true,posting:true,management_mapping:'inventory'},{id:'liability',company_id:'co',code:'210100',active:true,posting:true,management_mapping:'payables'}]})}};
 return {ctx:{admin:true,permissions:{},svc:{entities}},company,orders,calls,journal};
}
test('all-transactions audit shows posted PO 282 with its invoice and existing journal, without posting again',async()=>{
 const f=fixture(),before=structuredClone(f.journal),page=await listTransactionAudit(f.ctx,f.company,{source_entity:'PurchaseInvoice',status:'all',mapping_status:'all'});
 assert.equal(page.items.length,1);assert.equal(page.items[0].status,'posted');assert.equal(page.items[0].mapping.status,'ready');
 assert.deepEqual(page.items[0].purchase_orders,[{id:'po',order_number:'PO-REG-1021-EL-GOMHOREYA-0282'}]);assert.deepEqual(page.items[0].journal_ids,['posted']);assert.deepEqual(f.journal,before);
 assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].q,{branch_id:{$in:['branch']},purchase_recorded_invoice_id:{$in:['inv']}});assert.equal(f.calls[0].o.limit,250);
});
test('mapping exceptions still excludes correctly posted and routed purchases',async()=>{
 const f=fixture(),page=await listTransactionAudit(f.ctx,f.company,{source_entity:'PurchaseInvoice',status:'all',mapping_status:'exceptions'});assert.equal(page.items.length,0);
});