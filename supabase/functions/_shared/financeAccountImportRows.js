import { ACCOUNT_CLASSES } from './financeAccountModel.js';
import { requireValue } from './financeValidation.js';
const key=value=>String(value).trim().toLowerCase().replace(/[\s-]+/g,'_');
export function normalizeAccountImport(rows,chart){
 requireValue(Array.isArray(rows)&&rows.length>0&&rows.length<=500,'Import 1–500 account rows at a time.');
 const normalized=rows.map((row,index)=>{requireValue(row&&typeof row==='object'&&!Array.isArray(row),`Invalid row ${index+2}.`);const r=Object.fromEntries(Object.entries(row).map(([k,v])=>[key(k),v]));
  const get=(...keys)=>{const k=keys.find(k=>r[k]!==undefined&&r[k]!==null);return k?String(r[k]).trim():'';};
  const code=get('account_code','code'),normal=get('normal_balance','nature').toLowerCase(),classification=ACCOUNT_CLASSES[code[0]];
  const declaredClass=get('classification');requireValue(!declaredClass||declaredClass===classification,`Row ${index+2}: classification does not match account code.`);
  const type=get('account_type').toLowerCase(),expectedType={assets:'assets',liabilities:'liabilities',equity:'equity',revenue:'revenue',cogs:'expenses',operating_expenses:'expenses',other_result:'other income/expense',income_tax:'expenses'}[classification];requireValue(!type||type===expectedType,`Row ${index+2}: account_type does not match the code range.`);
  const statement=get('financial_statement').toLowerCase();requireValue(!statement||statement===(Number(code[0])<=3?'balance sheet':'income statement'),`Row ${index+2}: financial_statement does not match the code range.`);
  const bool=(name,fallback)=>{const value=get(name).toLowerCase();if(!value)return fallback;requireValue(['true','false','yes','no','1','0','active','inactive','posting','group'].includes(value),`Row ${index+2}: invalid ${name}.`);return ['true','yes','1','active','posting'].includes(value);};
  const status=get('status');requireValue(!status||['active','inactive'].includes(status.toLowerCase()),`Row ${index+2}: status must be Active or Inactive.`);
  return {code,name:get('account_name','name'),name_ar:get('name_ar','account_name_arabic','arabic_name'),parent_code:get('parent_code'),normal_balance:normal,classification,management_mapping:get('management_mapping')||(classification==='revenue'&&normal==='debit'?'revenue_deductions':classification),statutory_mapping:get('statutory_mapping'),active:status?status.toLowerCase()==='active':bool('active',true),posting:bool('posting',null),effective_from:get('effective_from'),effective_to:get('effective_to'),report_cash_equivalent:get('report_cash_equivalent')||'auto',report_cash_flow_section:get('report_cash_flow_section')||'unclassified'};
 });
 const parents=new Set([...chart,...normalized].map(a=>a.parent_code).filter(Boolean));return normalized.map(a=>({...a,posting:a.posting??(!!a.parent_code&&!parents.has(a.code))}));
}