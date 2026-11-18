import { requireValue,validDate } from './financeValidation.js';
export const ACCOUNT_CLASSES={1:'assets',2:'liabilities',3:'equity',4:'revenue',5:'cogs',6:'operating_expenses',7:'other_result',8:'income_tax'};
export async function accountRecords(entity,query){
 const rows=[];let cursor;
 do{const page=await entity.filter(query,{limit:200,sort:'id',...(cursor?{cursor}:{})});rows.push(...page.items);requireValue(rows.length<=3000,'This account review exceeds 3,000 records. Narrow the selection before continuing.');cursor=page.has_more?page.next_cursor:null;requireValue(!page.has_more||cursor,'The account review could not finish pagination.');}while(cursor);
 return rows;
}
export function accountDefinition(company,data,existing){
 const text=(key,max=200)=>{const value=data[key]??existing?.[key]??'';requireValue(typeof value==='string'&&value.length<=max,`Invalid ${key.replaceAll('_',' ')} (maximum ${max} characters).`);return value.trim();};
 const code=text('code',12),name=text('name');requireValue(/^[1-8][0-9]{0,11}$/.test(code),'Use a numeric account code of 1–12 digits starting with 1–8.');requireValue(name,'Account name is required.');
 const classification=ACCOUNT_CLASSES[code[0]];requireValue(!data.classification||data.classification===classification,'Classification must match the first digit of the account code.');
 const normal_balance=text('normal_balance');requireValue(['debit','credit'].includes(normal_balance),'Choose Debit or Credit.');
 for(const key of ['active','posting'])requireValue(typeof data[key]==='boolean',`Choose a valid ${key} setting.`);
 const clean={company_id:company.id,account_key:`${company.id}:${code}`,code,name,name_ar:text('name_ar'),parent_code:text('parent_code',12),classification,normal_balance,active:data.active,posting:data.posting,management_mapping:text('management_mapping'),statutory_mapping:text('statutory_mapping'),effective_from:text('effective_from',10),effective_to:text('effective_to',10),report_cash_equivalent:text('report_cash_equivalent')||'auto',report_cash_flow_section:text('report_cash_flow_section')||'auto'};
 for(const key of ['effective_from','effective_to'])requireValue(!clean[key]||validDate(clean[key]),'Choose valid effective dates.');requireValue(!clean.effective_from||!clean.effective_to||clean.effective_from<=clean.effective_to,'Effective dates are reversed.');
 requireValue(!clean.posting||clean.management_mapping,'Posting accounts require a management reporting mapping.');
 requireValue(['auto','yes','no'].includes(clean.report_cash_equivalent)&&['auto','operating','investing','financing','unclassified'].includes(clean.report_cash_flow_section),'Choose valid cash-flow reporting settings.');requireValue(clean.report_cash_equivalent!=='yes'||classification==='assets','Only asset accounts can be cash equivalents.');
 return clean;
}
export function validateAccountHierarchy(accounts){
 const byCode=new Map();for(const a of accounts){requireValue(!byCode.has(a.code),`Duplicate account code ${a.code}.`);byCode.set(a.code,a);}
 for(const a of accounts){
  if(!a.parent_code){requireValue(!a.posting,`Root account ${a.code} must be a group.`);continue;}
  const parent=byCode.get(a.parent_code);requireValue(parent,`Parent ${a.parent_code} for ${a.code} does not exist in this company.`);requireValue(!parent.posting,`Parent ${parent.code} must be a non-posting group.`);requireValue(parent.classification===a.classification,`Account ${a.code} and its parent must share a classification.`);
  const visited=new Set([a.code]);let p=parent;while(p){requireValue(!visited.has(p.code),`Account ${a.code} creates a parent cycle.`);visited.add(p.code);p=byCode.get(p.parent_code);}
 }
}
export function protectAccountChange(existing,clean,references=[]){
 if(!existing)return;
 requireValue(!references.length||(existing.code===clean.code&&existing.posting===clean.posting&&existing.classification===clean.classification),`Account ${existing.code} is referenced by ${references.join(', ')}. Its code, classification and posting/group setting cannot change.`);
 const mapped=references.filter(r=>['automatic mapping','module mapping','VAT mapping','mapping rule'].includes(r));requireValue(clean.active||!mapped.length,`Remove account ${existing.code} from ${mapped.join(', ')} before deactivating it.`);
}