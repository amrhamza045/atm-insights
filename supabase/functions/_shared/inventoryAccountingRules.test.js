import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryJournal } from './inventoryAccountingRules.js';
const company={id:'company',currency:'EGP',currency_decimals:2};
const binding=(key,category,account,priority=100)=>({id:`${key}:${category}:${priority}`,mapping_key:key,account_id:account,priority,effective_from:'2026-11-01',conditions:{category},inventory_stage:category==='raw'?'raw':category==='semi'?'semi_finished':'finished'});
const bindings=['raw','semi','finished'].flatMap(category=>[binding('INVENTORY_CONTROL_ACCOUNT',category,`asset:${category}`),binding('INVENTORY_WIP_ACCOUNT',category,`wip:${category}`),binding('INVENTORY_COGS_ACCOUNT',category,`cogs:${category}`)]);
const movement={kind:'production',branch_id:'branch',entry_date:'2026-11-08',currency:'EGP',snapshot:{inputs:[{inventory_item_id:'flour',category_id:'raw',quantity:2,cost:40},{inventory_item_id:'sauce',category_id:'semi',quantity:1,cost:10}],output:{inventory_item_id:'meal',category_id:'finished',quantity:10,cost:50}}};
test('production credits actual raw/semi assets through configured WIP into finished inventory',()=>{
 const p=inventoryJournal(company,movement,bindings),by=id=>p.lines.filter(l=>l.account_id===id);
 assert.equal(by('asset:raw')[0].credit,40);assert.equal(by('asset:semi')[0].credit,10);
 assert.equal(by('wip:finished').reduce((n,l)=>n+l.debit-l.credit,0),0);assert.equal(by('asset:finished')[0].debit,50);
 assert.equal(p.lines.reduce((n,l)=>n+l.debit-l.credit,0),0);assert.ok(p.mapping_bindings.every(b=>b.binding_id));
});
test('finished sales debit configured COGS and credit the actual finished inventory account',()=>{
 const p=inventoryJournal(company,{...movement,kind:'sale',snapshot:{items:[{inventory_item_id:'meal',category_id:'finished',quantity:2,cost:10}]}},bindings);
 assert.deepEqual(p.lines.map(l=>[l.account_id,l.debit,l.credit]),[['cogs:finished',10,0],['asset:finished',0,10]]);
});
test('missing and ambiguous category accounts block without a hard-coded fallback',()=>{
 assert.throws(()=>inventoryJournal(company,movement,bindings.filter(b=>b.mapping_key!=='INVENTORY_WIP_ACCOUNT')),/Missing account mapping/);
 assert.throws(()=>inventoryJournal(company,movement,[...bindings,{...bindings.find(b=>b.mapping_key==='INVENTORY_CONTROL_ACCOUNT'&&b.conditions.category==='raw'),id:'duplicate'}]),/Ambiguous/);
});
test('future-dated higher priority rules leave past cost routing intact',()=>{
 const future={...binding('INVENTORY_CONTROL_ACCOUNT','finished','future-asset',200),effective_from:'2026-12-01'};
 const p=inventoryJournal(company,movement,[...bindings,future]);assert.ok(!p.lines.some(l=>l.account_id==='future-asset'));
});
test('fractional carrying costs round cumulatively without losing batch value',()=>{
 const m={...movement,snapshot:{inputs:[.006,.006,.001].map((cost,i)=>({inventory_item_id:`i${i}`,category_id:'raw',quantity:1,cost})),output:{inventory_item_id:'out',category_id:'semi',quantity:1,cost:.013}}};
 const p=inventoryJournal(company,m,bindings);assert.equal(p.lines.reduce((s,l)=>s+Math.round(l.debit*100)-Math.round(l.credit*100),0),0);assert.equal(p.lines.find(l=>l.account_id==='asset:semi').debit,.01);
});