export const FINANCE_WORKSPACE_GROUPS = [
 {id:'configuration',title:'Configuration',description:'Manage accounts, mappings, posting connections, tax rules and company controls.',sections:['accounts','mapping','automatic','opening','tax_rules','vat_settings','variance_alerts','controls','manual']},
 {id:'reporting',title:'Reporting',description:'Review financial statements, journals, tax returns, reconciliation and audit records.',sections:['health','statements','customers','suppliers','journals','proposals','legacy','vat','einvoices','tax_system','integrity','audit']},
 {id:'transaction_audit',title:'Transaction Audit',description:'Inspect missing journals, define supported routing and recover transactions with confirmation or independent one-time review.',sections:['transaction_audit']},
 {id:'analytics',title:'Analytics',description:'Explore financial performance, comparisons, profitability, cost changes and forecasts.',sections:['dashboard','comparison','channels','recipe_changes','planning']},
 {id:'legal_company',title:'Legal company Definition',description:'Select and edit the existing legal company without replacing its accounting records.',sections:['company_definition']},
];
export function financeWorkspaceFeatures(features){
 const available=new Map(features.map(f=>[f.id,f]));
 if(available.has('tax_system'))available.set('tax_rules',{id:'tax_rules',title:'Tax rules'});
 if(available.has('vat'))available.set('vat_settings',{id:'vat_settings',title:'VAT account mappings'});
 if(available.has('comparison'))available.set('variance_alerts',{id:'variance_alerts',title:'Branch alert settings'});
 return FINANCE_WORKSPACE_GROUPS.flatMap(group=>group.sections.filter(id=>available.has(id)).map(id=>({...available.get(id),group:group.id})));
}