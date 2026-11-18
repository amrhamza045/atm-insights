import { requireValue } from './financeValidation.js';
export async function assertUnusedBinding(ctx,company,binding) {
 const e=ctx.svc.entities,scope={company_id:company.id};
 const counts=await Promise.all([
  e.FinanceJournal.count({...scope,'source_summary.mapping_bindings.binding_id':binding.id}),
  e.FinanceJournal.count({...scope,'lines.binding_id':binding.id}),
  e.FinanceProposal.count({...scope,'source_summary.mapping_bindings.binding_id':binding.id}),
  e.FinanceProposal.count({...scope,'lines.binding_id':binding.id}),
  e.InventoryAccountingMovement.count({...scope,binding_ids:binding.id}),
  e.SupplierLedgerEntry.count({...scope,'account_snapshot.mapping_bindings.binding_id':binding.id})
 ]);
 requireValue(counts.every(n=>n===0),'Historical or pending stock/accounting transactions use this mapping. Keep it unchanged; add a higher-priority future-dated rule instead.',409);
}