import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { accountRecords,accountDefinition,validateAccountHierarchy,protectAccountChange } from './financeAccountModel.js';
import { financeAccountReferences } from './financeAccountReferences.js';
import { normalizeAccountImport } from './financeAccountImportRows.js';
import { invalidateAccountReports } from './financeAccountInvalidation.js';
import { accountImportConflicts } from './financeAccountImportConflicts.js';
export async function financeAccountImport(ctx,company,input,apply=false){
 financePermission(ctx,'finance_accounts_manage');requireValue(['add','update'].includes(input.mode),'Choose add missing accounts or update matching codes.');
 const chart=await accountRecords(ctx.svc.entities.FinanceAccount,{company_id:company.id}),byCode=new Map(chart.map(a=>[a.code,a])),seen=new Set(),errors=[],plan=[];
 let rows;try{rows=normalizeAccountImport(input.rows,chart);}catch(error){if(!error.status||apply)throw error;return {token:'',summary:{add:0,update:0,skip:0},errors:[{message:error.message}],rows:[]};}
 const conflicts=accountImportConflicts(rows,chart);
 for(const [index,row] of rows.entries()){
  try{requireValue(!seen.has(row.code),`Duplicate code ${row.code}. Edit the incoming code below and validate again.`);seen.add(row.code);const existing=byCode.get(row.code);const clean=accountDefinition(company,row,existing);plan.push({row:index+2,operation:existing?(input.mode==='update'?'update':'skip'):'add',existing,clean});}
  catch(error){if(!error.status)throw error;errors.push({row:index+2,message:error.message});}
 }
 if(!errors.length){try{const proposed=new Map(chart.map(a=>[a.code,a]));for(const p of plan)if(p.operation!=='skip')proposed.set(p.clean.code,p.clean);validateAccountHierarchy([...proposed.values()]);const changing=plan.filter(p=>p.operation==='update'),refs=await financeAccountReferences(ctx,company,changing.map(p=>p.existing));for(const p of changing)protectAccountChange(p.existing,p.clean,refs.get(p.existing.id));}catch(error){if(!error.status)throw error;errors.push({message:error.message});}}
 const content=JSON.stringify({mode:input.mode,chart:chart.map(a=>[a.id,a.updated_date]).sort(),rows:plan.map(p=>p.clean)});const token=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const summary={add:plan.filter(p=>p.operation==='add').length,update:plan.filter(p=>p.operation==='update').length,skip:plan.filter(p=>p.operation==='skip').length};
 if(!apply)return {token,summary,errors,conflicts,source_rows:rows,rows:plan.map(p=>({...p.clean,row:p.row,operation:p.operation}))};
 requireValue(!errors.length,errors.map(e=>`${e.row?`Row ${e.row}: `:''}${e.message}`).join(' '));requireValue(input.token===token,'The chart or import settings changed. Preview the import again before saving.',409);requireValue(input.confirm===true,'Confirm the reviewed import.');
 const additions=plan.filter(p=>p.operation==='add');if(additions.length)await ctx.svc.entities.FinanceAccount.bulkCreate(additions.map(p=>p.clean));
 const updates=plan.filter(p=>p.operation==='update');for(let start=0;start<updates.length;start+=4)await Promise.all(updates.slice(start,start+4).map(async p=>{await invalidateAccountReports(ctx,company,p.existing,p.clean);await ctx.svc.entities.FinanceAccount.update(p.existing.id,p.clean);}));
 return {summary};
}