import { requireValue, validDate } from './financeValidation.js';
import { resolveMappingLines } from './financeBindingResolver.js';
import { mappingDefinition, mappingMatches, decimalUnits, MAPPING_BASES, MAPPING_DIMENSIONS } from './financeMappingValidation.js';
export function mappingSample(company,input){
 requireValue(input&&typeof input==='object'&&!Array.isArray(input),'Provide a sample transaction.');requireValue(validDate(input.date),'Sample accounting date is required.');
 const amounts=input.amounts,dimensions=input.dimensions;requireValue(amounts&&typeof amounts==='object'&&!Array.isArray(amounts)&&Object.keys(amounts).every(k=>MAPPING_BASES.includes(k)),'Invalid sample amount bases.');
 requireValue(dimensions&&typeof dimensions==='object'&&!Array.isArray(dimensions)&&Object.keys(dimensions).every(k=>[...MAPPING_DIMENSIONS,'category','tax_profile','payment_method'].includes(k)),'Invalid sample dimensions.');
 for(const v of Object.values(dimensions))requireValue(typeof v==='string'&&v.length<=120,'Dimensions must be text values.');
 requireValue(company.branch_ids.includes(dimensions.branch_id),'Select a branch owned by this company.');requireValue(!dimensions.currency||dimensions.currency===company.currency,'Sample currency must match this company.');
 const clean={};for(const [k,v] of Object.entries(amounts)){decimalUnits(v,company.currency_decimals);clean[k]=String(v);}
 return {date:input.date,amounts:clean,dimensions:{...dimensions,currency:company.currency}};
}
export async function loadMappingAccounts(ctx,company,lines){
 const ids=[...new Set(lines.map(l=>l.account_id))];
 const page=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:ids}},{limit:100});
 return new Map(page.items.map(a=>[a.id,a]));
}
export async function simulateMapping(ctx,company,definition,input,{accounts:providedAccounts,accountBindings}={}){
 const rule=mappingDefinition(company,definition,{historical:true}),sample=mappingSample(company,input);requireValue(mappingMatches(rule,sample),'Sample does not match the rule conditions or effective dates.');
 for(const key of rule.required_dimensions)requireValue(sample.dimensions[key],`Missing required dimension: ${key}.`);
 const resolved=await resolveMappingLines(ctx,company,rule.lines,sample,accountBindings);
 const accounts=providedAccounts||await loadMappingAccounts(ctx,company,resolved);
 let debit=0,credit=0;const scale=10**company.currency_decimals;
 const lines=resolved.map(l=>{
  const a=accounts.get(l.account_id);requireValue(a&&a.active&&a.posting&&a.management_mapping,'Every line needs an active company posting account with a reporting mapping.');requireValue((!a.effective_from||a.effective_from<=sample.date)&&(!a.effective_to||a.effective_to>=sample.date),`Account ${a.code} is not effective on the sample date.`);
  requireValue(Object.hasOwn(sample.amounts,l.basis),`Missing amount basis: ${l.basis}. Enter zero explicitly when not applicable.`);const units=decimalUnits(sample.amounts[l.basis],company.currency_decimals);requireValue(units>=0||l.negative_behavior==='reverse',`Negative ${l.basis} is not allowed.`);
  const side=units<0?(l.side==='debit'?'credit':'debit'):l.side,amount=Math.abs(units);if(side==='debit')debit+=amount;else credit+=amount;
  return {...l,account_code:a.code,account_name:a.name,debit:side==='debit'?amount/scale:0,credit:side==='credit'?amount/scale:0,dimensions:sample.dimensions,explanation:`${l.side} ${l.role||a.name}, using ${l.basis}${units<0?' with reversal':''}`};
 });
 requireValue(Number.isSafeInteger(debit)&&Number.isSafeInteger(credit)&&debit>0&&debit===credit,'Sample journal is empty, unbalanced or exceeds safe precision.');
 return {balanced:true,total_debit:debit/scale,total_credit:credit/scale,currency:company.currency,lines,sample,rule_name:rule.name,posting_enabled:false,note:'Configuration simulation only. No journal, payment, stock movement or balance was changed. Tax and valuation amounts must be supplied by future validated source adapters.'};
}