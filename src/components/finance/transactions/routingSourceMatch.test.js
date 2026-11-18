import test from 'node:test';
import assert from 'node:assert/strict';
import routingSourceMatch from './routingSourceMatch.js';
const detail={source_date:'2026-11-05',routing:{context:{branch_id:'branch',payment_method:'instapay',payment_type:'refund',customer_id:'customer',event_id:'event',currency:'EGP'}}};
test('rule review considers every selected condition and both date boundaries',()=>{
 assert.equal(routingSourceMatch(detail,'2026-11-05','2026-11-05',{}),true);
 assert.equal(routingSourceMatch(detail,'2026-11-06','',{}),false);
 assert.equal(routingSourceMatch(detail,'2026-11-04','2026-11-04',{}),false);
 for(const key of Object.keys(detail.routing.context))assert.equal(routingSourceMatch(detail,'2026-11-04','',{[key]:'different'}),false,key);
 assert.equal(routingSourceMatch(detail,'2026-11-04','',detail.routing.context),true);
});