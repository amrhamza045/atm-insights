import test from 'node:test';
import assert from 'node:assert/strict';
import { currentAuditBlocker } from './financeTransactionDiagnostics.js';
import { transactionSource } from './financeTransactionSources.js';
const company={id:'company',currency:'EGP',currency_decimals:2};
const source={id:'source',branch_id:'b',entry_date:'2026-11-04',reference_type:'catering_payment',reference_id:'payment',entries:[]};
const payment={id:'payment',branch_id:'b',status:'completed',payment_type:'penalty',payment_date:'2026-11-04',payment_method:'instapay'};
function context(){return {payments:new Map([['payment',payment]]),bindings:[{mapping_key:'CUSTOMER_ADVANCE_ACC',account_id:'advance',priority:100,effective_from:'2026-01-01'}],accounts:new Map([['advance',{id:'advance',active:true,posting:true,management_mapping:'liabilities'}]])};}
test('audit distinguishes current missing cancellation routing from unknown history',()=>{
 assert.match(currentAuditBlocker(company,transactionSource('JournalEntry'),source,[source],context()),/Missing account mapping for Cancellation_Customer/);
});
test('future-effective routing cannot repair an earlier transaction automatically',()=>{
 const c=context();c.bindings.push({mapping_key:'Cancellation_Customer',account_id:'revenue',priority:100,effective_from:'2026-11-05'});
 assert.match(currentAuditBlocker(company,transactionSource('JournalEntry'),source,[source],c),/Missing account mapping for Cancellation_Customer/);
});
test('audit reports disabled routing and closed periods deterministically',()=>{
 assert.match(currentAuditBlocker({...company,closed_through:'2026-11-04'},transactionSource('JournalEntry'),source,[source],context()),/locked/);
 const c=context();c.bindings=[];assert.match(currentAuditBlocker(company,transactionSource('JournalEntry'),source,[source],c),/disabled/);
});
test('unconnected direct sources are not advertised as automated',()=>{
 assert.match(currentAuditBlocker(company,transactionSource('Expense'),{status:'approved'},[],context()),/No live posting adapter/);
});