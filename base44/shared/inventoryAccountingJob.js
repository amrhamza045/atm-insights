import { requireValue } from './financeValidation.js';
import { withFinanceLock,financeBranch } from './financeAccess.js';
import { inventoryOwner } from './inventoryAccountingContext.js';
import { postInventorySource } from './inventoryAccountingSource.js';
const LEDGER_SOURCES={ProductionOrder:s=>s.status==='completed',CateringEvent:s=>s.status==='completed',Order:s=>['paid','completed'].includes(s.status)};
// A stock cost on a branch whose finance company has stock accounting off is never skipped
// silently: it opens a posting issue that a later successful posting resolves.
async function flagStockAccountingOff(db,entity,source){
 if(!LEDGER_SOURCES[entity]?.(source))return;
 const owners=await db.FinanceCompany.filter({is_active:{$ne:false},branch_ids:source.branch_id},{limit:5});
 for(const c of owners.items)await db.FinancePostingIssue.upsert([{issue_key:`${c.id}:inventory-source:${entity}:${source.id}`,company_id:c.id,branch_id:source.branch_id,source_entity:entity,source_id:source.id,source_description:`Inventory event ${entity}`,entry_date:(source.completed_date||source.created_date||'').slice(0,10),status:'open',message:'Stock accounting is switched off for this company, so this stock cost was not recorded in the ledger. Switch it on in Finance › Mapping Accounts › Inventory.',last_attempt_at:new Date().toISOString()}],{key:'issue_key'});
}
export async function runInventoryJob(ctx,input) {
 const entity=input.inventory_entity,db=ctx.svc.entities;
 requireValue(['InventoryAccountingMovement','ProductionOrder','Order','CateringCustodyCheckpoint','KitchenReleaseSlip','CateringEvent'].includes(entity),'Unsupported inventory event.');
 const source=await db[entity].get(input.source_id),company=await inventoryOwner(db,source.branch_id);if(!company){await flagStockAccountingOff(db,entity,source);return {skipped:true,reason:'Inventory accounting is not enabled for this branch.'};}financeBranch(ctx,company,source.branch_id);
 try{return await withFinanceLock(ctx,company,fresh=>postInventorySource(ctx,fresh,entity,source));}catch(error){if(![400,409].includes(error.status))throw error;
  await db.FinancePostingIssue.upsert([{issue_key:`${company.id}:inventory-source:${entity}:${source.id}`,company_id:company.id,branch_id:source.branch_id,source_entity:entity,source_id:source.id,source_description:`Inventory event ${entity}`,entry_date:source.confirmed_at?.slice(0,10)||source.completed_date?.slice(0,10)||'',status:'open',message:error.message,last_attempt_at:new Date().toISOString()}],{key:'issue_key'});
  return {blocked:true,message:error.message,retry:error.status===409};
 }
}