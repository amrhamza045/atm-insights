import { branchQuery, financeBranch } from './financeAccess.js';
import { requireValue, validDate } from './financeValidation.js';
export const HEALTH_VERSION='financial-health-v2';
export function healthScope(ctx,company,input){
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Company financial health requires unrestricted company-branch access.',403);
 const today=new Date().toISOString().slice(0,10),from=input.from||`${today.slice(0,7)}-01`,to=input.to||today;
 requireValue(validDate(from)&&validDate(to)&&from<=to,'Select a valid health-check date range.');
 if(input.branch_id)financeBranch(ctx,company,input.branch_id);
 return {from,to,branch_id:input.branch_id||'',branches:input.branch_id?{branch_id:input.branch_id}:branchQuery(ctx,company),cutoff:new Date().toISOString()};
}
export async function healthAnalysis(ctx,company,input){
 const scope=healthScope(ctx,company,input),record=await ctx.svc.entities.FinanceHealthAnalysis.get(input.analysis_id);
 requireValue(record.company_id===company.id&&record.version===HEALTH_VERSION,'Financial health report not found.',404);
 if(record.branch_id)financeBranch(ctx,company,record.branch_id);
 requireValue(record.branch_id===scope.branch_id&&record.from===scope.from&&record.to===scope.to,'Report scope changed. Select the original report scope or run a new check.',409);
 return record;
}
export async function healthTasks(tasks,concurrency=5){
 const output={};for(let start=0;start<tasks.length;start+=concurrency){const batch=tasks.slice(start,start+concurrency),results=await Promise.allSettled(batch.map(([,run])=>run()));results.forEach((r,i)=>{output[batch[i][0]]=r.status==='fulfilled'?{value:r.value}:{error:String(r.reason?.message||'Evidence could not be read').slice(0,300)};});}return output;
}
export function healthCheck(id,title,status,actual,recommendation,section='health'){
 return {id,title,status,actual,recommendation,section};
}
export function summarizeHealth(checks){
 return {pass:checks.filter(c=>c.status==='Pass').length,fail:checks.filter(c=>c.status==='Fail').length,review:checks.filter(c=>!['Pass','Fail'].includes(c.status)).length,status:checks.some(c=>c.status==='Fail')?'Issues found':'Review required'};
}