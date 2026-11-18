import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { accountRecords } from './financeAccountModel.js';
import { financeAccountReferences } from './financeAccountReferences.js';
export async function financeAccountCleanup(ctx,company,input){
 financePermission(ctx,'finance_accounts_manage');requireValue(Array.isArray(input.ids)&&input.ids.length>0&&input.ids.length<=500&&input.ids.every(id=>typeof id==='string'),'Select 1–500 accounts.');requireValue(['delete','deactivate','activate'].includes(input.operation),'Choose a cleanup action.');
 const chart=await accountRecords(ctx.svc.entities.FinanceAccount,{company_id:company.id}),ids=new Set(input.ids),accounts=chart.filter(a=>ids.has(a.id));requireValue(accounts.length===ids.size,'An account is missing or belongs to another company. Refresh the chart.',409);
 const refs=await financeAccountReferences(ctx,company,accounts),byCode=new Map(chart.map(a=>[a.code,a]));
 const rows=accounts.map(a=>{let reasons=refs.get(a.id)||[];
  if(input.operation==='activate')reasons=[];
  if(input.operation==='deactivate')reasons=reasons.filter(r=>['automatic mapping','module mapping','VAT mapping','mapping rule'].includes(r));
  if(input.operation==='delete'&&chart.some(child=>child.parent_code===a.code&&!ids.has(child.id)))reasons=[...reasons,'has child accounts outside this selection'];
  return {id:a.id,code:a.code,name:a.name,blocked:reasons.length>0,reasons};
 });
 if(input.operation==='delete'){
  let changed;do{changed=false;for(const row of rows)if(!row.blocked&&chart.some(child=>child.parent_code===row.code&&rows.some(r=>r.id===child.id&&r.blocked))){row.blocked=true;row.reasons.push('has a protected child account');changed=true;}}while(changed);
 }
 const signature=JSON.stringify({operation:input.operation,accounts:accounts.map(a=>[a.id,a.updated_date]).sort(),rows});const token=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 if(!input.confirm)return {rows,token};
 requireValue(input.confirm===true&&input.token===token,'Account details or references changed. Review eligible accounts again before cleanup.',409);
 const approved=rows.filter(r=>!r.blocked);requireValue(approved.length,'No selected accounts can be changed safely.');
 if(input.operation==='delete'){
  const depth=code=>{let n=0,p=byCode.get(code);const seen=new Set();while(p?.parent_code&&!seen.has(p.code)){seen.add(p.code);n++;p=byCode.get(p.parent_code);}return n;};approved.sort((a,b)=>depth(b.code)-depth(a.code));
  for(const row of approved){const before=accounts.find(a=>a.id===row.id);await ctx.base44.asServiceRole.entities.FinanceAuditEvent.create({company_id:company.id,actor_id:ctx.user.id,actor_email:ctx.user.email,actor_name:ctx.user.full_name||'',actor_type:'user',request_id:ctx.auditRequestId,operation:'delete_unused_account',action:'update',entity_type:'FinanceAccount',entity_id:row.id,entity_label:`${row.code} ${row.name}`,before,after:{id:row.id,code:row.code,deleted:true},changed_fields:['deleted'],reason:'Confirmed cleanup of unused, unreferenced account.'});await ctx.svc.entities.FinanceAccount.delete(row.id);}
 }else{for(let start=0;start<approved.length;start+=4)await Promise.all(approved.slice(start,start+4).map(row=>ctx.svc.entities.FinanceAccount.update(row.id,{active:input.operation==='activate'})));}
 return {changed:approved.length,protected:rows.filter(r=>r.blocked),operation:input.operation};
}