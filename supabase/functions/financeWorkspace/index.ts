import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { financeContext, financeCompany, withFinanceLock } from '../_shared/financeAccess.js';
import { updateFinanceCompany, lockFinancePeriod } from '../_shared/financeCompanies.js';
import { saveFinanceCompanyDefinition } from '../_shared/financeCompanyDefinition.js';
import { installFinanceTemplate, saveFinanceAccount } from '../_shared/financeAccounts.js';
import { financeAccountWorkbook } from '../_shared/financeAccountWorkbook.js';
import { financeAccountExport } from '../_shared/financeAccountExport.js';
import { financeAccountImport } from '../_shared/financeAccountImport.js';
import { financeAccountCleanup } from '../_shared/financeAccountCleanup.js';
import { prepareFinanceProposal, decideFinanceProposal } from '../_shared/financeProposals.js';
import { prepareOperational, prepareOperationalBacklog, operationalIssueKey } from '../_shared/financeOperationalReview.js';
import { readFinanceWorkspace } from '../_shared/financeRead.js';
import { configureFinanceAutomatic, syncFinanceSources, postFinanceSource } from '../_shared/financeAutomatic.js';
import { financeStatements } from '../_shared/financeStatements.js';
import { configureModules, moduleMappings, historyModule, previewModule, prepareModule, moduleSource, postModule } from '../_shared/financeModulePosting.js';
import { financeBranch, financePermission } from '../_shared/financeAccess.js';
import { audit } from '../_shared/auditLog.js';
import { requireValue } from '../_shared/financeValidation.js';
import { readFinancePlanning,generateFinanceBudget,saveFinanceBudget } from '../_shared/financePlanning.js';
import { financeIntegrity } from '../_shared/financeIntegrity.js';
import { financeDashboard } from '../_shared/financeDashboard.js';
import { financeBranchTrends } from '../_shared/financeBranchTrends.js';
import { financeChannels } from '../_shared/financeChannels.js';
import { financeRecipeChanges } from '../_shared/financeRecipeChanges.js';
import { taxConfig,saveTaxConfig } from '../_shared/financeTaxConfig.js';
import { readTaxDocuments,readVatReconciliation } from '../_shared/financeTaxReports.js';
import { saveTaxDocument,saveTaxStatus } from '../_shared/financeTaxDocuments.js';
import { financeTaxSystem,taxSystemActions } from '../_shared/financeTaxSystem.js';
import { financeFeatures } from '../_shared/financeManualCatalog.js';
import { readFinanceManual } from '../_shared/financeManual.js';
import { comparisonCompanies,saveFinanceParent } from '../_shared/financeHierarchy.js';
import { financeComparison } from '../_shared/financeComparison.js';
import { readFinanceAudit } from '../_shared/financeAuditRead.js';
import { financeMappingRead, financeMappingWrite } from '../_shared/financeMappingService.js';
import { financeRecoveryRead, financeRecoveryWrite } from '../_shared/financeEventRecovery.js';
import { financeBindings } from '../_shared/financeBindings.js';
import { financeBlueprintReview } from '../_shared/financeBlueprintReview.js';
import { runFinanceHealth, readFinanceHealth, advanceFinanceHealth } from '../_shared/financeHealthService.js';
import { financeHealthAdvice } from '../_shared/financeHealthAdvice.js';
import { prepareHealthRepair } from '../_shared/financeHealthRepairPreview.js';
import { applyHealthRepair } from '../_shared/financeHealthRepairApply.js';
import { listTransactionAudit, inspectTransactionAudit } from '../_shared/financeTransactionAudit.js';
import { recoverTransaction, prepareTransactionOneTime } from '../_shared/financeTransactionRecovery.js';
import { previewTransactionRecovery } from '../_shared/financeTransactionPreview.js';
import { saveTransactionRouting } from '../_shared/financeTransactionRouting.js';
import { confirmTransactionJournal } from '../_shared/financeTransactionEvidence.js';
import { correctPaymentMethod } from '../_shared/financePaymentMethodCorrection.js';
import { auditRoutingOptions } from '../_shared/financeAuditOptions.js';
import { mappingConditionOptions } from '../_shared/financeMappingOptions.js';
import { financePaymentMethods } from '../_shared/financePaymentMethods.js';
import { financeWasteReasons } from '../_shared/financeWasteReasons.js';
import { readOpenings } from '../_shared/financeOpening.js';
import { postOpeningCash } from '../_shared/financeOpeningCash.js';
import { postOpeningStock } from '../_shared/financeOpeningStock.js';
import { postOpeningAsset } from '../_shared/financeOpeningAsset.js';
import { postOpeningAdvance } from '../_shared/financeOpeningAdvance.js';
import { previewProductionPosting } from '../_shared/inventoryProductionPreview.js';
import { catchUpInventoryHistory } from '../_shared/inventoryHistoryCatchUp.js';
import { inventoryConfiguration } from '../_shared/inventoryAccountingConfiguration.js';
import { postInventoryMovement } from '../_shared/inventoryAccountingPosting.js';
import { postInventorySource } from '../_shared/inventoryAccountingSource.js';
import { postWasteLocked } from '../_shared/inventoryWastePosting.js';
async function handler(req) {
 try {
  const base44=createClientFromRequest(req),ctx=await financeContext(base44),input=await req.json();
  ctx.auditOperation=input.action;
  if(input.action==='manual') {
   if(input.company_id)await financeCompany(ctx,input.company_id);
   return Response.json(await readFinanceManual(ctx));
  }
  if(input.action==='setup') {
   const query=ctx.admin?{}:{member_emails:ctx.user.email.toLowerCase()};
   const companies=await ctx.svc.entities.FinanceCompany.filter(query,{sort:'-created_date',limit:50,...(input.cursor?{cursor:input.cursor}:{})});
   return Response.json({...companies,items:companies.items.map(({write_token,...c})=>c),permissions:ctx.permissions,is_admin:ctx.admin});
  }
  if(input.action==='branches') {
   let query=ctx.admin||!ctx.permissions.branch_id?{}:{id:ctx.permissions.branch_id};
   if(input.company_id){const c=await financeCompany(ctx,input.company_id);const ids=ctx.admin||!ctx.permissions.branch_id?c.branch_ids:c.branch_ids.filter(id=>id===ctx.permissions.branch_id);query={id:{$in:ids}};}
   const page=await ctx.svc.entities.Branch.filter(query,{limit:50,sort:'-created_date',...(input.cursor?{cursor:input.cursor}:{})});
   return Response.json({...page,items:page.items.map(({id,name})=>({id,name}))});
  }
  const company=await financeCompany(ctx,input.company_id);
  if(input.action==='inventory_configuration')return Response.json(await inventoryConfiguration(ctx,company,input));
  if(input.action==='inventory_configuration_save')return Response.json(await withFinanceLock(ctx,company,fresh=>inventoryConfiguration(ctx,fresh,input)));
  if(input.action==='payment_methods')return Response.json(await financePaymentMethods(ctx,company,input));
  if(['payment_method_save','payment_method_toggle','payment_method_delete'].includes(input.action))return Response.json(await withFinanceLock(ctx,company,fresh=>financePaymentMethods(ctx,fresh,input)));
  if(input.action==='waste_reasons')return Response.json(await financeWasteReasons(ctx,company,input));
  if(['waste_reason_save','waste_reason_toggle'].includes(input.action))return Response.json(await withFinanceLock(ctx,company,fresh=>financeWasteReasons(ctx,fresh,input)));
  if(input.action==='opening_balances')return Response.json(await readOpenings(ctx,company));
  if(input.action==='opening_cash_post')return Response.json(await withFinanceLock(ctx,company,fresh=>postOpeningCash(ctx,fresh,input)));
  if(input.action==='opening_stock_post')return Response.json(await withFinanceLock(ctx,company,fresh=>postOpeningStock(ctx,fresh,input)));
  if(input.action==='opening_asset_post')return Response.json(await withFinanceLock(ctx,company,fresh=>postOpeningAsset(ctx,fresh,input)));
  if(input.action==='opening_advance_post')return Response.json(await withFinanceLock(ctx,company,fresh=>postOpeningAdvance(ctx,fresh,input)));
  if(input.action==='inventory_production_preview')return Response.json(await previewProductionPosting(ctx,company,input));
  if(input.action==='inventory_history_catch_up')return Response.json(await catchUpInventoryHistory(ctx,company,input));
  if(input.action==='features')return Response.json({items:financeFeatures(ctx)});
  if(input.action==='transaction_audit')return Response.json(await listTransactionAudit(ctx,company,input));
  if(input.action==='transaction_inspect')return Response.json(await inspectTransactionAudit(ctx,company,input));
  if(input.action==='transaction_routing_options')return Response.json(await auditRoutingOptions(ctx,company,input));
  if(input.action==='mapping_condition_options')return Response.json(await mappingConditionOptions(ctx,company,input));
  if(input.action==='transaction_verify')return Response.json(await confirmTransactionJournal(ctx,company,input.journal_id));
  if(input.action==='transaction_payment_method_correct')return Response.json(await withFinanceLock(ctx,company,fresh=>correctPaymentMethod(ctx,fresh,input)));
  if(['transaction_preview','transaction_recover','transaction_one_time','transaction_routing_save'].includes(input.action))return Response.json(await withFinanceLock(ctx,company,fresh=>input.action==='transaction_preview'?previewTransactionRecovery(ctx,fresh,input):input.action==='transaction_recover'?recoverTransaction(ctx,fresh,input):input.action==='transaction_one_time'?prepareTransactionOneTime(ctx,fresh,input):saveTransactionRouting(ctx,fresh,input)));
  if(input.action==='health_read')return Response.json(await readFinanceHealth(ctx,company,input));
  if(input.action==='health_run')return Response.json(await runFinanceHealth(ctx,company,input));
  if(input.action==='health_advice')return Response.json(await financeHealthAdvice(ctx,company,input));
  if(input.action==='health_next')return Response.json(await advanceFinanceHealth(ctx,company,input));
  if(['health_repair_preview','health_repair_apply'].includes(input.action))return Response.json(await withFinanceLock(ctx,company,fresh=>input.action==='health_repair_preview'?prepareHealthRepair(ctx,fresh,input):applyHealthRepair(ctx,fresh,input)));
  
  if (input.action === 'custodies') { const { listCustodies } = await import('../../shared/financeCustody.js'); return Response.json(await listCustodies(ctx, company)); }
  if (['custody_fund', 'custody_return'].includes(input.action)) {
    const { openOrFundCustody, returnOrCloseCustody } = await import('../../shared/financeCustody.js');
    return Response.json(await withFinanceLock(ctx, company, fresh => input.action === 'custody_fund' ? openOrFundCustody(ctx, fresh, input) : returnOrCloseCustody(ctx, fresh, input)));
  }
  if (input.action === 'hr_payouts') { const { listHrPayouts } = await import('../../shared/financeHrPayouts.js'); return Response.json(await listHrPayouts(ctx, company, input.branch_id)); }
  if (input.action === 'hr_payout_confirm') { const { confirmHrPayout } = await import('../../shared/financeHrPayouts.js'); return Response.json(await withFinanceLock(ctx, company, fresh => confirmHrPayout(ctx, fresh, input))); }

  if(input.action==='account_export')return Response.json(await withFinanceLock(ctx,company,fresh=>financeAccountExport(ctx,fresh)));
  if(input.action==='account_import_source')return Response.json(await financeAccountWorkbook(ctx));
  if(input.action==='account_import_preview')return Response.json(await financeAccountImport(ctx,company,input));
  if(input.action==='account_cleanup_preview')return Response.json(await financeAccountCleanup(ctx,company,{...input,confirm:false}));
  if(['mapping_recovery_list','mapping_recovery_sources'].includes(input.action))return Response.json(await financeRecoveryRead(ctx,company,input));
  if(['mapping_recovery_capture','mapping_recovery_retry'].includes(input.action))return Response.json(await withFinanceLock(ctx,company,fresh=>financeRecoveryWrite(ctx,fresh,input)));
  if(['mapping_catalogue','mapping_versions','mapping_simulate','mapping_resolve','mapping_policy_checks'].includes(input.action))return Response.json(await financeMappingRead(ctx,company,input));
  if(input.action==='mapping_blueprint_review')return Response.json(await financeBlueprintReview(ctx,company));
  if(input.action==='mapping_bindings')return Response.json(await financeBindings(ctx,company,input));
  if(['mapping_binding_save','mapping_binding_delete'].includes(input.action))return Response.json(await withFinanceLock(ctx,company,fresh=>financeBindings(ctx,fresh,input)));
  if(['mapping_save','mapping_copy','mapping_submit','mapping_decide','mapping_delete'].includes(input.action))return Response.json(await withFinanceLock(ctx,company,fresh=>financeMappingWrite(ctx,fresh,input)));
  if(input.action==='audit_history')return Response.json(await readFinanceAudit(ctx,company,input));
  if(input.action==='comparison_companies')return Response.json(await comparisonCompanies(ctx,company,input));
  if(input.action==='comparison')return Response.json(await financeComparison(ctx,company,input));
  if(input.action==='set_parent'){
   const result=await saveFinanceParent(ctx,company,input);
   await audit(base44,ctx.user,'update','FinanceCompany','Updated parent company relationship',{entityId:company.id,changes:result});
   return Response.json(result);
  }
  if(input.action==='company_details'){const {write_token,...details}=company;return Response.json(details);}
  if(input.action==='read') return Response.json(await readFinanceWorkspace(ctx,company,input));
  if(taxSystemActions.includes(input.action))return Response.json(await financeTaxSystem(ctx,company,input));
  if(input.action==='tax_config')return Response.json(await taxConfig(ctx,company));
  if(input.action==='tax_documents')return Response.json(await readTaxDocuments(ctx,company,input));
  if(input.action==='vat_reconciliation')return Response.json(await withFinanceLock(ctx,company,fresh=>readVatReconciliation(ctx,fresh,input)));
  if(['save_tax_config','save_tax_document','save_tax_status'].includes(input.action)){
   const result=await withFinanceLock(ctx,company,fresh=>input.action==='save_tax_config'?saveTaxConfig(ctx,fresh,input):input.action==='save_tax_document'?saveTaxDocument(ctx,fresh,input):saveTaxStatus(ctx,fresh,input));
   if(!result.replayed)await audit(base44,ctx.user,'update',result.document?'FinanceTaxDocument':'FinanceTaxConfig',`Manual tax tracking: ${input.action}`,{entityId:result.document?.id||result.config?.id,entityName:result.document?.invoice_number,changes:{previous:result.previous,document:result.document,config:result.config}});
   return Response.json(result);
  }
  if(input.action==='module_mappings')return Response.json(await moduleMappings(ctx,company));
  if(input.action==='module_history')return Response.json(await historyModule(ctx,company,input));
  if(input.action==='module_preview'){financePermission(ctx,'finance_reconstruct');return Response.json(await previewModule(ctx,company,input));}
   if(input.action==='dashboard')return Response.json(await withFinanceLock(ctx,company,fresh=>financeDashboard(ctx,fresh,input)));
    if(input.action==='branch_trends')return Response.json(await withFinanceLock(ctx,company,fresh=>financeBranchTrends(ctx,fresh,input)));
   if(input.action==='channels')return Response.json(await withFinanceLock(ctx,company,fresh=>financeChannels(ctx,fresh,input)));
   if(input.action==='recipe_changes')return Response.json(await financeRecipeChanges(ctx,company,input));
     if(input.action==='planning')return Response.json(await withFinanceLock(ctx,company,fresh=>readFinancePlanning(ctx,fresh,input)));
     if(input.action==='integrity')return Response.json(await withFinanceLock(ctx,company,fresh=>financeIntegrity(ctx,fresh,input)));
     if(input.action==='statements')return Response.json(await withFinanceLock(ctx,company,fresh=>financeStatements(ctx,fresh,input)));
     requireValue(['install_template','save_account','account_import','account_cleanup','prepare','decide','lock_period','members','save_company_definition','configure_auto','sync_auto','retry_auto','prepare_operational','configure_modules','prepare_module','generate_budget','save_budget','approve_budget'].includes(input.action),'Unknown action.');
  const result=await withFinanceLock(ctx,company,async fresh=>{
   if(input.action==='save_company_definition')return await saveFinanceCompanyDefinition(ctx,fresh,input);
   if(input.action==='generate_budget')return await generateFinanceBudget(ctx,fresh,input);
   if(input.action==='save_budget'||input.action==='approve_budget')return await saveFinanceBudget(ctx,fresh,input,input.action==='approve_budget');
   if(input.action==='configure_modules')return await configureModules(ctx,fresh,input.data||{});
   if(input.action==='prepare_module')return await prepareModule(ctx,fresh,input);
   if(input.action==='install_template')return await installFinanceTemplate(ctx,fresh);
   if(input.action==='save_account')return await saveFinanceAccount(ctx,fresh,input.data||{},input.id);
   if(input.action==='account_import')return await financeAccountImport(ctx,fresh,input,true);
   if(input.action==='account_cleanup')return await financeAccountCleanup(ctx,fresh,input);
   if(input.action==='prepare')return await prepareFinanceProposal(ctx,fresh,input.data||{});
   if(input.action==='decide')return await decideFinanceProposal(ctx,fresh,input.data||{});
   if(input.action==='lock_period')return await lockFinancePeriod(ctx,fresh,input.data||{});
       if(input.action==='configure_auto')return await configureFinanceAutomatic(ctx,fresh,input.data||{});
       if(input.action==='sync_auto')return await syncFinanceSources(ctx,fresh,input);
       if(input.action==='prepare_operational'){financePermission(ctx,'finance_journal_create');return await prepareOperationalBacklog(ctx,fresh);}
       if(input.action==='retry_auto') {
        financePermission(ctx,'finance_journal_approve');
        const issue=await ctx.svc.entities.FinancePostingIssue.get(input.id);
        requireValue(issue?.company_id===fresh.id,'Posting exception not found.',404);financeBranch(ctx,fresh,issue.branch_id);
        if(issue.issue_key===operationalIssueKey(fresh,issue.source_entity,issue.source_id))return await prepareOperational(ctx,fresh,issue.source_entity,await ctx.svc.entities[issue.source_entity].get(issue.source_id));
        if(issue.issue_key===`${fresh.id}:inventory-source:${issue.source_entity}:${issue.source_id}`&&['Order','ProductionOrder','CateringCustodyCheckpoint','KitchenReleaseSlip','CateringEvent'].includes(issue.source_entity))return await postInventorySource(ctx,fresh,issue.source_entity,await ctx.svc.entities[issue.source_entity].get(issue.source_id));
        if(issue.source_entity==='WasteDeclaration')return await postWasteLocked(ctx,fresh,await ctx.svc.entities.WasteDeclaration.get(issue.source_id));
        if(issue.source_entity==='InventoryAccountingMovement')return await postInventoryMovement(ctx,fresh,await ctx.svc.entities.InventoryAccountingMovement.get(issue.source_id));
        if(['Order','PurchaseInvoice'].includes(issue.source_entity)){
         const source=await moduleSource(ctx,fresh,issue.source_entity,issue.source_id);
         return await postModule(ctx,fresh,issue.source_entity,source,issue.entry_date,true);
        }
        const source=await ctx.svc.entities.JournalEntry.get(issue.source_id);
        return await postFinanceSource(ctx,fresh,source);
       }
       return await updateFinanceCompany(ctx,fresh,input.data||{});
  });
  await audit(base44,ctx.user,'update','FinanceCompany',`Finance ${input.action}`,{entityId:company.id,changes:{proposal_id:input.data?.proposal_id,journal_id:result.journal?.id,account_id:result.account?.id,budget_id:result.budget?.id,budget_revision:result.budget?.revision}});
  return Response.json(result);
 }catch(error){console.error('Finance request failed:',error.message);return Response.json({error:error.message},{status:error.status||500});}
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
