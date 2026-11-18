import { financePermission } from './financeAccess.js';
import { requireValue,validDate } from './financeValidation.js';
import { taxUnits,taxRate } from './financeTaxMath.js';
export const taxKinds=['vat','withholding','payroll','corporate'];
const clean=(s,max=200)=>String(s||'').trim().slice(0,max);
export async function readTaxRules(ctx,company,input){
 const query={company_id:company.id};if(input.kind){requireValue(taxKinds.includes(input.kind),'Unknown tax rule type.');query.kind=input.kind;}
 if(input.entry_date){requireValue(validDate(input.entry_date),'Select a valid tax recognition date.');query.effective_from={$lte:input.entry_date};query.$or=[{effective_to:''},{effective_to:{$gte:input.entry_date}}];}
 if(input.direction){requireValue(['sales','purchases'].includes(input.direction),'Invalid tax direction.');query.direction={$in:[input.direction,'both']};}
 if(input.search){const escaped=clean(input.search,80).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');query.$and=[{$or:[{code:{$regex:escaped,$options:'i'}},{name:{$regex:escaped,$options:'i'}}]}];}
 return await ctx.svc.entities.FinanceTaxRule.filter(query,{sort:'-effective_from',limit:50,...(input.cursor?{cursor:input.cursor}:{})});
}
export async function saveTaxRule(ctx,company,input){
 financePermission(ctx,'finance_accounts_manage');requireValue(company.currency==='EGP','Egypt tax profiles require an EGP finance company.');const d=input.data||{},code=clean(d.code,80),name=clean(d.name),legal_reference=clean(d.legal_reference,2000),exemption_reason=clean(d.exemption_reason,1000);
 requireValue(taxKinds.includes(d.kind)&&code&&name&&legal_reference&&d.confirmed===true,'Enter the profile, legal reference and confirm accountant review.');requireValue(validDate(d.effective_from)&&(!d.effective_to||validDate(d.effective_to)&&d.effective_to>=d.effective_from),'Invalid effective dates.');requireValue(['sales','purchases','both'].includes(d.direction),'Choose a tax direction.');
 const decimals=company.currency_decimals,data={company_id:company.id,kind:d.kind,code,name,direction:['payroll','corporate'].includes(d.kind)?'both':d.direction,effective_from:d.effective_from,effective_to:d.effective_to||'',legal_reference,exemption_reason};
 if(d.kind==='payroll'){
  requireValue(Array.isArray(d.brackets)&&d.brackets.length>0&&d.brackets.length<=30,'Configure 1–30 annual progressive bands.');let lower=0;
  data.brackets=d.brackets.map((b,i)=>{const up_to_units=b.up_to===''||b.up_to===null?null:taxUnits(b.up_to,decimals);requireValue(up_to_units===null?i===d.brackets.length-1:up_to_units>lower,'Upper limits must increase; only the final band can be unlimited.');if(up_to_units!==null)lower=up_to_units;return {up_to_units,rate:taxRate(b.rate)};});requireValue(data.brackets.at(-1).up_to_units===null,'The final payroll band must be unlimited.');
  data.annual_relief_units=taxUnits(d.annual_relief,decimals);data.annual_income_min_units=taxUnits(d.annual_income_min,decimals);data.annual_income_max_units=d.annual_income_max===''||d.annual_income_max===null?null:taxUnits(d.annual_income_max,decimals);requireValue(data.annual_income_max_units===null||data.annual_income_max_units>data.annual_income_min_units,'Invalid payroll applicability band.');
 }else{data.rate=taxRate(d.rate);requireValue(data.rate!==0||exemption_reason,'A zero-rate profile requires an exemption / zero-rating explanation.');}
 requireValue(typeof input.request_id==='string'&&/^[0-9a-f-]{36}$/i.test(input.request_id),'A unique request identifier is required.');const signature=JSON.stringify(data),retry=(await ctx.svc.entities.FinanceTaxRule.filter({company_id:company.id,request_id:input.request_id},{limit:1})).items[0];if(retry){requireValue(retry.request_signature===signature,'Request identifier was reused for different tax rules.',409);return {rule:retry,replayed:true};}
 const previous=(await ctx.svc.entities.FinanceTaxRule.filter({company_id:company.id,kind:d.kind,code},{sort:'-version',limit:1})).items[0];if(previous){requireValue(d.effective_from>previous.effective_from,'A new version must begin after the previous version.');if(!previous.effective_to||previous.effective_to>=d.effective_from){const used=await ctx.svc.entities.FinanceTaxAssessment.count({company_id:company.id,rule_ids:previous.id,entry_date:{$gte:d.effective_from}});requireValue(!used,'Existing assessments use this profile after the proposed start; choose a later effective date.',409);await ctx.svc.entities.FinanceTaxRule.update(previous.id,{effective_to:new Date(Date.parse(d.effective_from)-86400000).toISOString().slice(0,10)});}}
 const rule=await ctx.svc.entities.FinanceTaxRule.create({...data,version:(previous?.version||0)+1,configured_by:ctx.user.email,request_id:input.request_id,request_signature:signature});return {rule};
}
export async function configuredRule(ctx,company,id,kind,date,direction){
 requireValue(typeof id==='string'&&id,'Select a configured tax profile.');const rule=await ctx.svc.entities.FinanceTaxRule.get(id);requireValue(rule?.company_id===company.id&&rule.kind===kind,'Tax profile does not belong to this company/type.',403);requireValue(rule.effective_from<=date&&(!rule.effective_to||rule.effective_to>=date),'Tax profile does not cover this date.');requireValue(!direction||rule.direction==='both'||rule.direction===direction,'Tax profile does not apply to this direction.');return rule;
}