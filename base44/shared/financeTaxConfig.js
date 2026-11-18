import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { taxChoices } from './financeTaxChoices.js';
export async function taxConfig(ctx,company){
 const page=await ctx.svc.entities.FinanceTaxConfig.filter({company_id:company.id},{limit:2});requireValue(page.items.length<=1,'Duplicate VAT configurations require administrator review.');const config=page.items[0]||null;
 const ids=config?[config.output_account_id,config.input_account_id]:[],accounts=ids.length?(await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:ids}},{limit:2})).items:[];
 const pick=id=>{const a=accounts.find(a=>a.id===id);return a?{account_id:a.id,account_code:a.code,account_name:a.name,classification:a.classification,active:a.active,posting:a.posting}:null;};
 return {config,mappings:{output:pick(config?.output_account_id),input:pick(config?.input_account_id)},choices:taxChoices};
}
export async function saveTaxConfig(ctx,company,input){
 financePermission(ctx,'finance_accounts_manage');requireValue(company.currency==='EGP','Egypt ETA reconciliation requires an EGP company; no currency conversion is inferred.');
 const {output_account_id,input_account_id}=input.data||{};requireValue(output_account_id&&input_account_id&&output_account_id!==input_account_id,'Select different output-VAT and recoverable input-VAT accounts.');
 const accounts=(await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:[output_account_id,input_account_id]}},{limit:2})).items;
 for(const [id,classification] of [[output_account_id,'liabilities'],[input_account_id,'assets']])requireValue(accounts.some(a=>a.id===id&&a.active&&a.posting&&a.classification===classification),`Select an active posting ${classification} account for VAT.`);
 const {config}=await taxConfig(ctx,company),data={company_id:company.id,output_account_id,input_account_id,configured_by:ctx.user.email};const saved=config?await ctx.svc.entities.FinanceTaxConfig.update(config.id,data):await ctx.svc.entities.FinanceTaxConfig.create(data);return {config:saved};
}