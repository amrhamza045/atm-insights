import { moduleSnapshot } from './financeModuleRules.js';
import { auditMappingState } from './financeAuditMapping.js';
import { currentAuditBlocker } from './financeTransactionDiagnostics.js';
import { transactionAmount } from './financeTransactionSources.js';
import { moneyUnits } from './financeValidation.js';
import { journalHealth,duplicateHealthJournals } from './financeHealthJournalEvidence.js';
import { healthInventoryEvidence } from './financeHealthInventoryEvidence.js';
import { healthSupplierReturn } from './financeHealthSupplierReturns.js';
import { healthSnapshotPair } from './financeHealthSnapshots.js';
const INVENTORY_SOURCES=['ProductionOrder','KitchenReleaseSlip','InventoryAccountingMovement','CateringCustodyCheckpoint'];
export function assessHealthSource(company,def,s,links,evidence){
 if(def.entity==='SupplierLedgerEntry')return healthSupplierReturn(company,s,links,evidence);
 const inventory=INVENTORY_SOURCES.includes(def.entity),mapping=inventory?null:auditMappingState(company,def,s,links.ops,evidence.diagnostic),journals=links.journals;
 const row={source_id:s.id,journal_ids:journals.map(j=>j.id),finality:'Eligible candidate',mapping:mapping?.reason||'',automation:inventory?company.module_policy?.inventory?.enabled?'Inventory policy enabled':'Inventory policy disabled':mapping?.status==='ready'?'Routing available; trigger delivery not established':mapping?.status==='unsupported'?'Direct connection missing':'Routing blocked',posting_issue:links.issues.map(i=>i.message).join('; ')||'No recorded open issue',pending:links.proposals.length,open_issues:links.issues.length,journal:journals.length?'Posted links found':'No posted link',reporting:'Not checked',status:'matched',reason:''};
 const finish=(status,reason)=>({...row,status,reason});
 if(duplicateHealthJournals(journals))return finish('duplicate','Multiple journals share a posting key. Reconcile duplicates; never delete posted entries.');
 if(inventory){const result=healthInventoryEvidence(company,links.movements,journals,evidence);row.mapping=result.mapping;if(!['matched','not_required'].includes(result.status))return finish(result.status,result.reason);if(result.status==='not_required'){row.journal='Intentionally no GL entry';row.reporting='Not applicable to a custody-only / zero-value movement';return finish(links.issues.length?'blocked':links.proposals.length?'pending':result.status,links.issues.length?'Custody / zero-value treatment has an unresolved Posting Issue; reconcile it without adding an unnecessary entry.':result.reason);}}
 else{
  const financial=journals.filter(j=>j.source_entity!=='InventoryAccountingMovement');
  if(financial.length>1||links.ops.length>1)return finish('duplicate','More than one financial posting or operational journal represents this source.');
  if(!financial.length)return finish(links.proposals.length?'pending':mapping.status==='missing'?'blocked':'missing',links.proposals.length?'Source-linked proposal awaits independent approval; do not post again.':links.issues[0]?.message||currentAuditBlocker(company,def,s,links.ops,evidence.diagnostic));
  const j=financial[0],snapshot=j.source_summary||{},op=links.ops.find(o=>o.id===j.source_id),pair=healthSnapshotPair(def.entity,s,snapshot),current=pair?pair.current:j.source_entity==='JournalEntry'?op?.entries:['Order','PurchaseInvoice'].includes(def.entity)?moduleSnapshot(def.entity,s):null,saved=pair?pair.saved:j.source_entity==='JournalEntry'?snapshot.entries:snapshot.source_snapshot;
  if(j.branch_id!==s.branch_id)return finish('changed','Source and posted journal branches differ.');
  const amount=transactionAmount(def,s);
  if(amount!==null&&moneyUnits(amount,company.currency_decimals)!==moneyUnits(j.total_debit,company.currency_decimals))return finish('amount_mismatch','Source amount differs from the financial journal; reconcile treatment before any correction.');
  if(!current||!saved)return finish('unverified','Posting exists but immutable source evidence is insufficient to certify the source amount and treatment.');
  if(JSON.stringify(current)!==JSON.stringify(saved))return finish('changed','Financial source fields changed after posting.');
  if(def.entity==='Order'&&company.module_policy?.inventory?.enabled){const stock=healthInventoryEvidence(company,links.movements,journals.filter(j=>j.source_entity==='InventoryAccountingMovement'),evidence);if(!['matched','not_required'].includes(stock.status))return finish(stock.status,`Sale collection exists; COGS: ${stock.reason}`);}
 }
 for(const j of journals){const result=journalHealth(company,j,evidence.ledger);if(result.status!=='matched')return finish(result.status,result.reason);}
 row.reporting='Every journal line agrees with reporting';
 if(links.proposals.length)return finish('pending','Posting exists and another source-linked proposal remains pending; reconcile before approving another entry.');
 if(links.issues.length)return finish('blocked','Posting exists but an open Posting Issue remains; reconcile the issue without reposting.');
 return finish('matched','Source snapshot, balanced journal and reporting lines agree; this does not establish future trigger delivery.');
}