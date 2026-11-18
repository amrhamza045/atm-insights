import test from 'node:test';
import assert from 'node:assert/strict';
import { auditMappingState, auditQueueMatches } from './financeAuditMapping.js';
const company={id:'co',currency:'EGP',currency_decimals:2,branch_ids:['b'],auto_post_enabled:true,auto_post_from:'2026-01-01',auto_source_currency:'EGP',auto_account_map:{cash:'a',advance:'l'}};
const source={id:'s',branch_id:'b',entry_date:'2026-01-10',entries:[{gl_account_id:'cash'},{gl_account_id:'advance'}]};
const accounts=new Map([['a',{company_id:'co',active:true,posting:true,management_mapping:'cash',code:'110100'}],['l',{company_id:'co',active:true,posting:true,management_mapping:'liability',code:'210100'}]]);
const context={accounts,bindings:[],payments:new Map(),methods:[]};
const def={entity:'JournalEntry',date:'entry_date'};
test('one-time posting and pending review cannot hide missing recurring mapping',()=>{
 for(const status of ['posted','pending','missing']){
  const row={status,mapping:{status:'missing'}};
  assert.equal(auditQueueMatches(row,{status:'all',mapping_status:'exceptions'}),true);
  assert.equal(auditQueueMatches(row,{mapping_status:'needs_mapping'}),true);
 }
});
test('valid recurring routing and historical recovery are separate',()=>{
 const mapping=auditMappingState({...company,closed_through:'2026-09-30'},def,source,[source],context,'2026-11-08');
 assert.equal(mapping.status,'ready');assert.equal(mapping.checked_date,'2026-11-08');
 assert.equal(auditQueueMatches({status:'posted',mapping},{mapping_status:'exceptions'}),false);
 assert.equal(auditQueueMatches({status:'missing',mapping},{mapping_status:'exceptions'}),true);
});
test('missing and inactive accounts stay visible after one-time correction',()=>{
 assert.equal(auditMappingState({...company,auto_account_map:{cash:'a'}},def,source,[source],context).status,'missing');
 const changed={...context,accounts:new Map([...accounts,['a',{...accounts.get('a'),active:false}]])};
 assert.equal(auditMappingState(company,def,source,[source],changed).status,'missing');
});
test('unsupported direct sources remain exceptions regardless of posting',()=>{
 const mapping=auditMappingState(company,{entity:'Expense',date:'expense_date'},{expense_date:'2026-01-01'},[],context);
 assert.equal(mapping.status,'unsupported');assert.equal(auditQueueMatches({status:'posted',mapping},{mapping_status:'exceptions'}),true);
});
test('captured payment accounts are not accepted as future configuration',()=>{
 const p={id:'p',branch_id:'b',payment_type:'deposit',payment_method:'cash',payment_date:'2026-01-01',payment_account_snapshot:{accounts:[{account_id:'a'},{account_id:'l'}]}};
 const mapping=auditMappingState(company,{entity:'CateringPayment',date:'payment_date'},p,[source],context);
 assert.equal(mapping.status,'missing');
});