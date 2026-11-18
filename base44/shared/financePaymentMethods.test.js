import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentMethodHasHistory, paymentMethodAccount } from './financePaymentMethodRules.js';
import { financePaymentMethods } from './financePaymentMethods.js';
import { configuredPaymentLines } from './configuredPaymentJournal.js';
const company={id:'co',branch_ids:['b'],currency:'EGP',currency_decimals:2};
const method={id:'m',company_id:'co',code:'custom_bank',name:'Custom bank',account_id:'asset',is_active:false,updated_date:'v1'};
const entities={CateringPayment:{count:async()=>0},JournalEntry:{count:async()=>0},FinanceJournal:{count:async()=>0},FinanceProposal:{count:async()=>0},Order:{count:async()=>0},FinanceAccountBinding:{count:async()=>0},SupplierLedgerEntry:{count:async()=>0},PayrollDisbursement:{count:async()=>0},EmployeeBorrowing:{count:async()=>0},Expense:{count:async()=>0},FinanceCustodyEntry:{count:async()=>0},FinanceOpeningBalance:{count:async()=>0},FinancePaymentMethod:{get:async()=>method,delete:async()=>({})}};
const ctx={admin:true,permissions:{},svc:{entities},base44:{asServiceRole:{entities:{FinanceAuditEvent:{create:async()=>({})}}}},user:{id:'u',email:'a'},auditRequestId:'r'};
test('historical payments and a durable usage marker forbid deletion',async()=>{
 assert.equal(await paymentMethodHasHistory(ctx,company,{...method,has_transactions:true}),true);
 const history={...ctx,svc:{entities:{...entities,CateringPayment:{count:async()=>1}}}};
 await assert.rejects(()=>financePaymentMethods(history,company,{action:'payment_method_delete',id:'m',expected_updated_date:'v1'}),/Deactivate/);
});
test('unused inactive method can be deleted; foreign company and stale edits are refused',async()=>{
 assert.deepEqual(await financePaymentMethods(ctx,company,{action:'payment_method_delete',id:'m',expected_updated_date:'v1'}),{deleted:true});
 await assert.rejects(()=>financePaymentMethods(ctx,{...company,id:'other'},{action:'payment_method_delete',id:'m',expected_updated_date:'v1'}),/company/);
 await assert.rejects(()=>financePaymentMethods(ctx,company,{action:'payment_method_delete',id:'m',expected_updated_date:'old'}),/changed/);
});
test('mapping accepts only active posting asset accounts in the owning company',()=>{
 const a={company_id:'co',active:true,posting:true,classification:'assets',management_mapping:'cash'};
 assert.doesNotThrow(()=>paymentMethodAccount(company,a));
 for(const change of [{company_id:'other'},{active:false},{posting:false},{classification:'liabilities'},{management_mapping:''}])assert.throws(()=>paymentMethodAccount(company,{...a,...change}));
});
test('custom method produces balanced compound lines without fixed account codes',()=>{
 const p={amount:125.75,event_id:'e',client_id:'c',payment_type:'deposit',payment_account_snapshot:{accounts:[{account_key:'PAYMENT_METHOD_ACC',account_id:'custom-asset'},{account_key:'CUSTOMER_ADVANCE_ACC',account_id:'custom-liability'}]}};
 const {lines,total_debit,total_credit}=configuredPaymentLines(p,2);
 assert.equal(lines[0].account_id,'custom-asset');assert.equal(lines[1].account_id,'custom-liability');assert.equal(total_debit,125.75);assert.equal(total_credit,total_debit);
 assert.throws(()=>configuredPaymentLines({...p,amount:NaN},2));
 assert.throws(()=>configuredPaymentLines({...p,payment_account_snapshot:{accounts:[]}},2));
});