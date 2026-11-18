import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { registerSupplierInvoice } from './supplierAccountReview.js';
import { paySupplier, openSupplierBalance } from './supplierAccountMutations.js';
import { supplierBalance, withSupplierLock } from './supplierAccountsAccess.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
function matches(row, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some(q => matches(row,q));
    const v = row[key];
    if (value && typeof value === 'object') return Object.entries(value).every(([op, target]) => op === '$in' ? target.includes(v) : op === '$nin' ? !target.includes(v) : op === '$ne' ? v !== target : op === '$lte' ? v <= target : op === '$gt' ? v > target : op === '$exists' ? (v !== undefined) === target : false);
    return v === value;
  });
}
function fixture() {
  const tables = {}, company = {id:'company',currency:'EGP',currency_decimals:2,write_token:'',branch_ids:['branch'],edition:'catering'}, supplier={id:'supplier',name:'Supplier'};
  const entity = name => {
    const rows = tables[name] ||= [];
    return {rows, async get(id){const r=rows.find(r=>r.id===id); if(!r) throw Object.assign(Error('Missing '+name),{status:404});return {...r};}, async filter(q){return {items:rows.filter(r=>matches(r,q)).map(r=>({...r})),has_more:false};}, async count(q){return rows.filter(r=>matches(r,q)).length;},async create(data){const r={...data,id:`${name}-${rows.length+1}`,updated_date:'v1'};rows.push(r);return {...r};},async update(id,data){const r=rows.find(r=>r.id===id);Object.assign(r,data);return {...r};},async updateMany(q,data){for(const r of rows.filter(r=>matches(r,q)))Object.assign(r,data.$set);},async aggregate({query,groupBy,sum}){const found=rows.filter(r=>matches(r,query)),groups=new Map();for(const r of found){const key=groupBy?r[groupBy]:'all';const out=groups.get(key)||{...(groupBy?{[groupBy]:key}:{}),count:0};out.count++;for(const k of sum||[])out['sum_'+k]=(out['sum_'+k]||0)+Number(r[k]||0);groups.set(key,out);}return {rows:[...groups.values()]};},async upsert(){return {records:[]};}};
  };
  const e=new Proxy({}, {get:(_,name)=>entity(name)});
  e.FinanceCompany.rows.push(company);e.Supplier.rows.push(supplier);
  const account=(id,code,classification)=>({id,code,name:id,classification,company_id:company.id,active:true,posting:true,management_mapping:id,statutory_mapping:''});
  e.FinanceAccount.rows.push(account('ap','210100','liabilities'),account('cash','110100','assets'),account('equity','310100','equity'));
  e.FinanceAccountBinding.rows.push({id:'binding',company_id:company.id,mapping_key:'VENDOR_AP_ACCOUNT',effective_from:'2020-01-01',priority:1,conditions:{},account_id:'ap'});
  e.FinancePaymentMethod.rows.push({id:'method',company_id:company.id,code:'cash',name:'Configured cash',account_id:'cash',is_active:true});
  const ctx={svc:{entities:e},base44:{asServiceRole:{entities:e}},company,supplier,user:{id:'user',email:'manager@example.invalid'},branch:'branch',query:{company_id:company.id,branch_id:'branch',supplier_id:supplier.id}};
  const invoice=(id,total,date='2026-11-01')=>({id,invoice_number:id,invoice_date:date,total_amount:total,supplier_id:supplier.id,branch_id:'branch',status:'posted',items:[{total_cost:total}],updated_date:'invoice-v1'});
  return {ctx,e,tables,invoice};
}
const request=(amount,key=crypto.randomUUID())=>({amount,request_key:key,entry_date:'2026-11-08',payment_method:'cash',notes:'Verified payment reference',invoice_id:'invoice'});
test('historical invoice review records known partial settlement without repeating cash or stock', async()=>{
 const {ctx,e,invoice}=fixture(),i=invoice('invoice',1000);e.PurchaseInvoice.rows.push(i);
 await registerSupplierInvoice(ctx,i,{paid:250,historical:true,notes:'Reviewed bank evidence'});
 assert.equal(await supplierBalance(ctx),750);assert.equal(e.FinanceJournal.rows.length,0);
 await registerSupplierInvoice(ctx,i,{paid:250,historical:true,notes:'Reviewed bank evidence'});
 assert.equal(e.SupplierLedgerEntry.rows.length,2);
 await assert.rejects(registerSupplierInvoice(ctx,i,{paid:200}),/different amounts/);
});
test('partial then full payment reduces supplier and invoice balance and uses mapped accounts',async()=>{
 const {ctx,e,invoice}=fixture(),i=invoice('invoice',1000);e.PurchaseInvoice.rows.push(i);await registerSupplierInvoice(ctx,i);
 const payment=request(300);await paySupplier(ctx,payment);assert.equal(await supplierBalance(ctx),700);
 const j=e.FinanceJournal.rows[0];assert.equal(j.lines[0].account_id,'ap');assert.equal(j.lines[0].debit,300);assert.equal(j.lines[1].account_id,'cash');assert.equal(j.lines[1].credit,300);
 await paySupplier(ctx,payment);assert.equal(e.FinanceJournal.rows.length,1);
 await assert.rejects(paySupplier(ctx,{...payment,amount:301}),/different details/);
 await paySupplier(ctx,request(700));assert.equal(await supplierBalance(ctx),0);
 await assert.rejects(paySupplier(ctx,request(1)),/exceed/);
});
test('opening balance excludes earlier invoices and cannot be overwritten or double-count imported invoices',async()=>{
 const {ctx,e,invoice}=fixture();const input={amount:500,entry_date:'2026-10-31',notes:'Verified opening statement',offset_account_id:'equity',confirmed:true};
 await openSupplierBalance(ctx,input);assert.equal(await supplierBalance(ctx),500);assert.equal(e.FinanceJournal.rows[0].kind,'opening');assert.equal(e.FinanceJournal.rows[0].lines[0].credit,500);
 await openSupplierBalance(ctx,input);assert.equal(e.FinanceJournal.rows.length,1);
 await assert.rejects(registerSupplierInvoice(ctx,invoice('old',100,'2026-10-31')),/double-count/);
 await registerSupplierInvoice(ctx,invoice('new',100));assert.equal(await supplierBalance(ctx),600);
 await assert.rejects(openSupplierBalance(ctx,{...input,amount:600}),/not overwritten/);
 const second=fixture();await registerSupplierInvoice(second.ctx,second.invoice('imported',100,'2026-10-30'));
 await assert.rejects(openSupplierBalance(second.ctx,input),/already imported/);
});
test('already-in-GL opening creates no duplicate journal and retries remain idempotent',async()=>{
 const {ctx,e}=fixture(),input={amount:500,entry_date:'2026-10-31',notes:'Existing GL opening evidence',already_in_gl:true,confirmed:true};
 await openSupplierBalance(ctx,input);await openSupplierBalance(ctx,input);assert.equal(e.FinanceJournal.rows.length,0);assert.equal(await supplierBalance(ctx),500);
});
test('pending payments resume without a second journal and block different payments',async()=>{
 const {ctx,e,invoice}=fixture(),i=invoice('invoice',1000);e.PurchaseInvoice.rows.push(i);await registerSupplierInvoice(ctx,i);
 const original=ctx.svc.entities;let fail=true;
 ctx.svc.entities=new Proxy(original,{get:(target,name)=>name==='FinanceLedgerLine'?{upsert:async()=>{if(fail)throw Error('Interrupted projection');return {records:[]};}}:target[name]});
 const payment=request(100);
 await assert.rejects(paySupplier(ctx,payment),/Interrupted projection/);
 assert.equal(e.FinanceJournal.rows.length,1);assert.equal(await supplierBalance(ctx),1000);
 await assert.rejects(paySupplier(ctx,request(100)),/incomplete/);
 fail=false;await paySupplier(ctx,payment);
 assert.equal(e.FinanceJournal.rows.length,1);assert.equal(await supplierBalance(ctx),900);
});
test('concurrent supplier operations cannot both acquire the supplier lock',async()=>{
 const {ctx}=fixture();let writes=0;
 const results=await Promise.allSettled([withSupplierLock(ctx,async()=>{writes++;await new Promise(r=>setTimeout(r,5));}),withSupplierLock(ctx,async()=>{writes++;})]);
 assert.equal(writes,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
});