export function reportCashAccount(a){return a.report_cash_equivalent==='yes'||(a.report_cash_equivalent!=='no'&&['110100','110200','110300'].includes(a.code||a.account_code));}
export function reportCashSection(a){
 if(a.report_cash_flow_section&&a.report_cash_flow_section!=='auto')return a.report_cash_flow_section;
 const code=a.code||a.account_code||'';
 if(code.startsWith('12')||code.startsWith('7102')||code.startsWith('7205'))return 'investing';
 if(code.startsWith('3')||['211700','211800','220100','220200'].includes(code))return 'financing';
 return 'operating';
}