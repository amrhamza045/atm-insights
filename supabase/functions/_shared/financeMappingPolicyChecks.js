import { requireValue } from './financeValidation.js';
import { mappingDefinition } from './financeMappingValidation.js';
import { resolveMappingLines, loadMappingBindings } from './financeBindingResolver.js';
import { simulateMapping, mappingSample, loadMappingAccounts } from './financeMappingSimulation.js';
export async function mappingPolicyChecks(ctx,company,definition,input){
 const rule=mappingDefinition(company,definition,{historical:true}),sample=mappingSample(company,input);
 const accountBindings=await loadMappingBindings(ctx,company,rule.lines);
 const accounts=await loadMappingAccounts(ctx,company,await resolveMappingLines(ctx,company,rule.lines,sample,accountBindings)),cases=[];
 const add=(name,expected,edit)=>{const s=structuredClone(sample),r=structuredClone(rule);edit?.(s,r);cases.push({name,expected,sample:s,rule:r});};
 add('Saved baseline balances','accept');
 add('Company branch isolation','reject',s=>{s.dimensions.branch_id='__outside_company__';});
 add('Foreign currency is refused','reject',s=>{s.dimensions.currency=company.currency==='USD'?'EUR':'USD';});
 add('Mandatory dimension is enforced','reject',s=>{delete s.dimensions[rule.required_dimensions[0]];});
 add('Missing amount basis is refused','reject',s=>{delete s.amounts[rule.lines[0].basis];});
 add('Excess decimal precision is refused','reject',s=>{s.amounts[rule.lines[0].basis]=`1.${'0'.repeat(company.currency_decimals)}1`;});
 add('Zero-value journal is refused','reject',s=>{for(const k of Object.keys(s.amounts))s.amounts[k]='0';});
 add('Inactive account is refused','reject',(s,r)=>{r.lines[0].account_key='';r.lines[0].account_id='__missing_account__';});
 add('Negative amount policy is enforced',rule.lines.some(l=>l.negative_behavior!=='reverse'&&Number(sample.amounts[l.basis])>0)?'reject':'accept',s=>{for(const k of Object.keys(s.amounts)){const v=s.amounts[k];s.amounts[k]=v.startsWith('-')?v.slice(1):v==='0'?'0':`-${v}`;}});
 if(rule.effective_from>'0001-01-01')add('Outside effective interval is refused','reject',s=>{s.date=new Date(Date.parse(rule.effective_from)-86400000).toISOString().slice(0,10);});
 const results=[];
 for(const item of cases){
  let actual='accept',message='Balanced sample accepted.';
  try{await simulateMapping(ctx,company,item.rule,item.sample,{accounts,accountBindings});}
  catch(error){if(!error.status||error.status>=500)throw error;actual='reject';message=error.message;}
  results.push({name:item.name,expected:item.expected,actual,passed:actual===item.expected,message});
 }
 requireValue(results.length>0,'No policy checks were generated.');
 return {rule_id:definition.id||'',rule_version:definition.version||null,rule_updated_date:definition.updated_date||'',checked_at:new Date().toISOString(),passed:results.every(r=>r.passed),checks:results,posting_enabled:false,note:'Software guardrail checks only, not accountant approval or proof of all tax and recognition policies. No financial records were changed.'};
}