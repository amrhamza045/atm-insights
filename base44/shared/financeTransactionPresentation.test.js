import test from 'node:test';
import assert from 'node:assert/strict';
import { transactionPresentation } from './financeTransactionPresentation.js';
const op={id:'op',entry_date:'2026-11-04',total_debit:2000,total_credit:2000,entries:[{account_number:'211100',debit:2000,credit:0},{account_number:'410800',debit:0,credit:2000}]};
test('one operational journal keeps debit and credit together',()=>{
 const view=transactionPresentation({entity:'JournalEntry'},op,[op],[]);
 assert.equal(view.journal_entries.length,1);assert.equal(view.journal_entries[0].lines.length,2);
 assert.equal(view.journal_entries[0].lines[0].debit,2000);assert.equal(view.journal_entries[0].lines[1].credit,2000);
 assert.equal(view.journal_entries[0].total_debit,2000);assert.equal(view.journal_entries[0].total_credit,2000);
});
test('document and linked journal use the same grouping key',()=>{
 const a=transactionPresentation({entity:'JournalEntry'},op,[op],[]),b=transactionPresentation({entity:'CateringPayment'},{id:'payment'},[op],[]);
 assert.equal(a.group_key,b.group_key);
});
test('posted company journal retains both debit and credit lines',()=>{
 const posted=[{id:'finance',entry_date:'2026-11-04',currency:'EGP',total_debit:2000,total_credit:2000,lines:[{account_code:'211100',debit:2000,credit:0},{account_code:'410800',debit:0,credit:2000}]}];
 const view=transactionPresentation({entity:'CateringPayment'},{id:'p'},[op],posted);
 assert.equal(view.group_key,'journal:finance');assert.equal(view.journal_entries.length,1);assert.equal(view.journal_entries[0].lines.length,2);assert.equal(view.journal_entries[0].kind,'Posted company journal');
});
test('multiple posted journals remain visible for duplicate accounting investigation',()=>{
 const view=transactionPresentation({entity:'JournalEntry'},op,[op],[{id:'j1',lines:[]},{id:'j2',lines:[]}]);assert.equal(view.journal_entries.length,2);
});
test('unlinked documents retain separate identities',()=>{
 assert.notEqual(transactionPresentation({entity:'Expense'},{id:'a'},[],[]).group_key,transactionPresentation({entity:'Expense'},{id:'b'},[],[]).group_key);
});