const omitted=new Set(['created_date','updated_date','created_by','created_by_id','write_token','write_started_at','ledger_ready','analytics_version','request_signature','source_summary']);
export const trackedFinanceEntities=new Set(['FinanceCompany','FinanceAccount','FinanceProposal','FinanceJournal','FinanceBudget','FinanceTaxRule','FinanceTaxAssessment','FinanceTaxConfig','FinanceTaxDocument','FinanceVarianceAlertConfig','FinanceMappingVersion','FinanceAccountBinding','FinanceEventRecovery','FinancePaymentMethod']);
export function auditSnapshot(record,entity){
 if(!record)return null;
 const allowed=entity==='FinanceVarianceAlertConfig'?new Set(['id','setting_key','owner_user_id','enabled','threshold_pp','targets','revision']):null;
 return Object.fromEntries(Object.entries(record).filter(([key])=>!omitted.has(key)&&(!allowed||allowed.has(key))));
}
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export function auditChangedFields(before,after){return [...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].filter(key=>JSON.stringify(canonical(before?.[key]))!==JSON.stringify(canonical(after?.[key])));}
export function auditScopes(entity,before,after){
 if(entity!=='FinanceVarianceAlertConfig')return [{company_id:entity==='FinanceCompany'?after.id:after.company_id||before?.company_id,branch_id:after.branch_id||before?.branch_id||'',before,after}];
 const scopes=new Map([...(before?.targets||[]),...(after.targets||[])].map(t=>[`${t.company_id}:${t.branch_id}`,t]));
 return [...scopes.values()].map(t=>({company_id:t.company_id,branch_id:t.branch_id,before:before?{...before,targets:(before.targets||[]).filter(x=>x.company_id===t.company_id&&x.branch_id===t.branch_id)}:null,after:{...after,targets:(after.targets||[]).filter(x=>x.company_id===t.company_id&&x.branch_id===t.branch_id)}}));
}
export function auditAction(entity,before,after){
 if(entity==='FinanceJournal'&&after.kind==='reversal'&&after.status==='posted')return 'reversal';
 if(['FinanceJournal','FinanceProposal','FinanceBudget'].includes(entity)&&before?.status!==after.status){if(after.status==='rejected')return 'reject';if(['posted','approved'].includes(after.status))return 'approve';}
 return before?'update':'create';
}