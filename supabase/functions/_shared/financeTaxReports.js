import { analyticsScope,reportUnits } from './financeAnalyticsScope.js';
import { requireValue } from './financeValidation.js';
import { indexFinanceLedger } from './financeLedger.js';
import { taxConfig } from './financeTaxConfig.js';
import { TAX_STATUSES,taxChoices } from './financeTaxChoices.js';
async function registerSummary(ctx,query,company){
 const result=await ctx.svc.entities.FinanceTaxDocument.aggregate({query,groupBy:['direction','vat_reviewed','eta_status'],sum:['signed_base_units','output_units','input_units','purchase_vat_units'],limit:100});requireValue(!result.truncated,'Tax summary was truncated; narrow the report.');
 const rows=result.rows,sum=field=>reportUnits(rows.reduce((n,r)=>n+reportUnits(r[`sum_${field}`]),0))/(10**company.currency_decimals),count=predicate=>rows.filter(predicate).reduce((n,r)=>n+Number(r.count||0),0);
 return {documents:count(()=>true),unreviewed:count(r=>r.vat_reviewed!==true),reviewed_with_eta_issues:count(r=>r.vat_reviewed===true&&['Invalid','Rejected','Cancelled'].includes(r.eta_status)),output:sum('output_units'),input:sum('input_units'),purchase_vat:sum('purchase_vat_units'),statuses:TAX_STATUSES.map(s=>({...s,count:count(r=>r.eta_status===s.value)}))};
}
export async function readTaxDocuments(ctx,company,input){
 const scope=await analyticsScope(ctx,company,input),query={...scope.ledgerScope,entry_date:{$gte:scope.from,$lte:scope.to}};if(input.eta_status){requireValue(TAX_STATUSES.some(s=>s.value===input.eta_status),'Invalid status filter.');query.eta_status=input.eta_status;}
 if(input.search){const text=String(input.search).slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');query.$or=['invoice_number','counterparty_name','eta_uuid','submission_uuid'].map(field=>({[field]:{$regex:text,$options:'i'}}));}
 const [page,summary]=await Promise.all([ctx.svc.entities.FinanceTaxDocument.filter(query,{limit:50,sort:'-entry_date',...(input.cursor?{cursor:input.cursor}:{})}),registerSummary(ctx,query,company)]);return {...page,summary,choices:taxChoices,from:scope.from,to:scope.to,today:scope.today};
}
export async function readVatReconciliation(ctx,company,input){
 requireValue(company.currency==='EGP','Egypt ETA VAT reconciliation requires an EGP company; no currency conversion is inferred.');const scope=await analyticsScope(ctx,company,input),settings=await taxConfig(ctx,company),query={...scope.ledgerScope,entry_date:{$gte:scope.from,$lte:scope.to}},register=await registerSummary(ctx,query,company);
 const {output,input:recoverable}=settings.mappings,configured=!!(output?.active&&output.posting&&output.classification==='liabilities'&&recoverable?.active&&recoverable.posting&&recoverable.classification==='assets'&&output.account_id!==recoverable.account_id);
 const result={ready:true,...settings,configured,from:scope.from,to:scope.to,today:scope.today,register,net_registered:register.output-register.input,ledger:null};if(!configured)return result;
 const remaining=await indexFinanceLedger(ctx,company);if(remaining)return {ready:false,remaining,from:scope.from,to:scope.to};
 const aggregate=dates=>ctx.svc.entities.FinanceLedgerLine.aggregate({query:{...scope.ledgerScope,account_code:{$in:[output.account_code,recoverable.account_code]},entry_date:dates},groupBy:'account_code',sum:['debit_units','credit_units'],limit:10});
 const [opening,movements]=await Promise.all([aggregate({$lt:scope.from}),aggregate({$gte:scope.from,$lte:scope.to})]);requireValue(!opening.truncated&&!movements.truncated,'VAT ledger summary was truncated; no partial totals are displayed.');
 const value=(rows,code,credit)=>{const r=rows.find(row=>row.account_code===code)||{};return reportUnits(reportUnits(r.sum_credit_units)-reportUnits(r.sum_debit_units))*(credit?1:-1)/(10**company.currency_decimals);};
 const out=value(movements.rows,output.account_code,true),inp=value(movements.rows,recoverable.account_code,false);result.ledger={output:out,input:inp,opening_output:value(opening.rows,output.account_code,true),opening_input:value(opening.rows,recoverable.account_code,false),difference_output:out-register.output,difference_input:inp-register.input};return result;
}