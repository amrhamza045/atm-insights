import test from 'node:test';
import assert from 'node:assert/strict';
import { runFinanceHealth, advanceFinanceHealth } from './financeHealthService.js';
import { HEALTH_SOURCES } from './financeHealthSources.js';
import { HEALTH_VERSION } from './financeHealthScope.js';
const company={id:'co',branch_ids:['b'],currency:'EGP',currency_decimals:2};
function readOnlyContext(record){
 const calls=[],reports=[];
 const handler=entity=>new Proxy({},{get:(_,method)=>async(...args)=>{
  calls.push([entity,method]);
  if(entity==='FinanceHealthAnalysis'&&method==='create'){reports.push(args[0]);return {...args[0],id:'report'};}
  if(entity==='FinanceHealthAnalysis'&&method==='update')return {...record,...args[1]};
  if(entity==='FinanceHealthAnalysis'&&method==='get')return record;
  if(method==='count')return 0;
  if(method==='aggregate')return {rows:[],truncated:false};
  if(method==='filter')return {items:[],has_more:false};
  throw new Error(`Forbidden write or unexpected operation: ${entity}.${method}`);
 }});
 const entities=new Proxy({},{get:(_,entity)=>handler(entity)});
 return {ctx:{admin:true,user:{id:'u'},permissions:{},svc:{entities}},calls,reports};
}
test('full expanded scan saves only a health report and never mutates accounting or issues',async()=>{
 const {ctx,calls,reports}=readOnlyContext();const result=await runFinanceHealth(ctx,company,{from:'2026-11-01',to:'2026-11-08'});
 assert.equal(reports.length,1);assert.equal(result.analysis.summary.sources.length,HEALTH_SOURCES.length);assert.equal(result.analysis.version,HEALTH_VERSION);
 assert.deepEqual(calls.filter(([,method])=>!['filter','count','aggregate'].includes(method)),[['FinanceHealthAnalysis','create']]);
 assert.ok(result.analysis.summary.sources.every(s=>s.total===0&&s.checked===0));
});
test('continuing a source batch updates only the report, not company locks or posting settings',async()=>{
 const record={id:'r',company_id:'co',version:HEALTH_VERSION,branch_id:'',from:'2026-11-01',to:'2026-11-08',cutoff:'2026-11-08T16:00:00Z',updated_date:'version',summary:{setup:[],sources:[{entity:'Expense',has_more:true,next_cursor:'next',checked:25,total:26,examples:[],samples:[]}]}};
 const {ctx,calls}=readOnlyContext(record);await advanceFinanceHealth(ctx,company,{...record,analysis_id:'r',source_entity:'Expense',expected_updated_date:'version'});
 assert.deepEqual(calls.filter(([,method])=>!['get','filter','count','aggregate'].includes(method)),[['FinanceHealthAnalysis','update']]);
});
test('reports cannot be read across companies or changed scopes',async()=>{
 const record={id:'r',company_id:'other',version:HEALTH_VERSION,branch_id:'',from:'2026-11-01',to:'2026-11-08'};
 const {ctx}=readOnlyContext(record);await assert.rejects(()=>advanceFinanceHealth(ctx,company,{analysis_id:'r',from:record.from,to:record.to}),/not found/);
});