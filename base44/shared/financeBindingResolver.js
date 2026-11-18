import { requireValue } from './financeValidation.js';
import { PAYMENT_ACCOUNT_KEYS, companyPaymentMethods, withPaymentMethods, resolvePaymentMethodBinding } from './financePaymentMethodSource.js';
export const BINDING_CONDITIONS=['branch_id','category','currency','tax_profile','payment_method','bank_cash_id','event_type_id','service_type_id','event_id','payment_type','customer_id','warehouse','return_reason_code','original_tx_id','issue_type'];
export const bindingMatches=(binding,sample)=>binding.effective_from<=sample.date&&(!binding.effective_to||binding.effective_to>=sample.date)&&Object.entries(binding.conditions||{}).every(([key,value])=>sample.dimensions?.[key]===value);
export function resolveAccountBinding(bindings,key,sample){
 // Cash and bank accounts come from Payment methods, never from mapping rules.
 if(PAYMENT_ACCOUNT_KEYS.includes(key))return resolvePaymentMethodBinding(bindings,key,sample);
 const matches=bindings.filter(b=>b.mapping_key===key&&bindingMatches(b,sample)&&(key!=='INVENTORY_CONTROL_ACCOUNT'||!sample.dimensions?.inventory_stage||!b.inventory_stage||b.inventory_stage===sample.dimensions.inventory_stage)).sort((a,b)=>b.priority-a.priority);
 requireValue(matches.length,`Missing account mapping for ${key}.`);
 requireValue(matches.length===1||matches[0].priority!==matches[1].priority,`Ambiguous account mapping for ${key}: equal winning priority.`,409);
 return matches[0];
}
export async function loadMappingBindings(ctx,company,lines){
 const keys=[...new Set(lines.map(l=>l.account_key).filter(Boolean))];if(!keys.length)return [];
 const page=await ctx.svc.entities.FinanceAccountBinding.filter({company_id:company.id,mapping_key:{$in:keys}},{limit:500});
 requireValue(!page.has_more,'Too many bindings to resolve safely. Narrow the account mappings.');
 return keys.some(k=>PAYMENT_ACCOUNT_KEYS.includes(k))?withPaymentMethods(page.items,await companyPaymentMethods(ctx.svc.entities,company)):page.items;
}
export async function resolveMappingLines(ctx,company,lines,sample,candidates){
 const bindings=candidates||await loadMappingBindings(ctx,company,lines);
 return lines.map(line=>{if(!line.account_key)return line;const lineSample=line.dimensions?{...sample,dimensions:{...sample.dimensions,...line.dimensions}}:sample;const b=resolveAccountBinding(bindings,line.account_key,lineSample);return {...line,account_id:b.account_id,binding_id:b.id,binding_updated_date:b.updated_date};});
}