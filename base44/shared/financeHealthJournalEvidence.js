import { validateLines, moneyUnits } from './financeValidation.js';
export function journalHealth(company,journal,ledger){
 try{
  const totals=validateLines(journal.lines,company.currency_decimals);
  if(totals.total_debit!==journal.total_debit||totals.total_credit!==journal.total_credit)return {status:'amount_mismatch',reason:'Stored journal totals differ from its balanced lines.'};
  if(journal.currency!==company.currency||!company.branch_ids.includes(journal.branch_id))return {status:'changed',reason:'Journal currency or branch does not belong to this company.'};
  const rows=ledger.filter(l=>l.journal_id===journal.id);
  if(!journal.ledger_ready||journal.analytics_version!==1||rows.length!==journal.lines.length)return {status:'reporting',reason:'Journal exists but its reporting index is incomplete; do not post again.'};
  const matches=journal.lines.every((line,i)=>{const row=rows.find(l=>l.line_key===`${journal.id}:${i}`);return row&&row.branch_id===journal.branch_id&&row.entry_date===journal.entry_date&&row.account_code===line.account_code&&row.debit_units===moneyUnits(line.debit,company.currency_decimals)&&row.credit_units===moneyUnits(line.credit,company.currency_decimals);});
  return matches?{status:'matched',reason:'Balanced journal totals and every reporting line agree.'}:{status:'reporting',reason:'Journal and reporting line values differ; review the index, not a second posting.'};
 }catch(error){if(![400,409].includes(error.status))throw error;return {status:'unverified',reason:error.message};}
}
export function duplicateHealthJournals(journals){
 const keys=journals.map(j=>j.posting_key).filter(Boolean);
 return new Set(keys).size!==keys.length;
}