import { journalHealth, duplicateHealthJournals } from './financeHealthJournalEvidence.js';
import { moneyUnits } from './financeValidation.js';
export function healthSupplierReturn(company,s,links,evidence){
 const journals=links.journals,row={source_id:s.id,journal_ids:journals.map(j=>j.id),finality:s.status==='posted'?'Confirmed supplier return':'Unfinished saved return',mapping:'Saved inventory, original supplier payable and variance mappings',automation:'Authorized supplier-return confirmation posts inline',posting_issue:links.issues.map(i=>i.message).join('; ')||'No recorded open issue',pending:links.proposals.length,open_issues:links.issues.length,journal:journals.length?'Posted return link found':'No posted return link',reporting:'Not checked'};
 const finish=(status,reason)=>({...row,status,reason});
 if(journals.length>1||duplicateHealthJournals(journals))return finish('duplicate','Multiple journals represent one supplier return; reconcile without reposting.');
 if(s.status!=='posted')return finish('pending','Resume the saved supplier return from supplier account history; do not submit a new return.');
 if(!journals.length)return finish('missing','Posted supplier credit has no linked return GL journal. Reconcile the saved return before any correction.');
 const j=journals[0],plan=s.account_snapshot;
 if(!plan?.items?.length||!plan.lines?.length||!plan.original_journal_id)return finish('unverified','Original invoice and immutable stock valuation evidence are missing.');
 if(j.branch_id!==s.branch_id||s.company_id!==company.id||s.currency!==company.currency||j.source_summary?.supplier_id!==s.supplier_id||j.source_summary?.invoice_id!==s.invoice_id)return finish('changed','Return, supplier, invoice or accounting scope differs from the journal.');
 if(JSON.stringify(j.source_summary.return_snapshot)!==JSON.stringify(plan)||JSON.stringify(j.lines)!==JSON.stringify(plan.lines))return finish('changed','Saved supplier-return evidence differs from the posted journal.');
 if(moneyUnits(-s.delta,company.currency_decimals)!==moneyUnits(plan.credit,company.currency_decimals))return finish('amount_mismatch','Supplier balance credit differs from the immutable purchase return valuation.');
 const result=journalHealth(company,j,evidence.ledger);if(result.status!=='matched')return finish(result.status,result.reason);
 row.reporting='Every return journal line agrees with reporting';
 if(links.proposals.length||links.issues.length)return finish(links.issues.length?'blocked':'pending','A return journal exists with another unresolved proposal or issue. Reconcile without duplicating stock or credit.');
 return finish('matched','Original invoice/stock valuation, supplier credit, balanced journal and reporting agree.');
}