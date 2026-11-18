import { withFinanceLock,financePermission } from './financeAccess.js';
import { audit } from './auditLog.js';
import { readTaxRules,saveTaxRule } from './financeTaxRules.js';
import { listTaxSources,taxSourceDetails } from './financeTaxSources.js';
import { taxReturnReport } from './financeTaxReturns.js';
import { payrollPosition } from './financePayrollPosition.js';
import { assessInvoiceTax } from './financeInvoiceTax.js';
import { assessPayrollTax } from './financePayrollTax.js';
import { corporateTaxBasis,assessCorporateTax } from './financeCorporateTax.js';
import { withholdingSchedule } from './financeWithholdingSchedule.js';
export const taxSystemActions=['tax_rules','tax_sources','tax_source','tax_return','payroll_position','tax_withholding_schedule','tax_corporate_basis','save_tax_rule','assess_invoice_tax','assess_payroll_tax','assess_corporate_tax'];
export async function financeTaxSystem(ctx,company,input){
 if(input.action==='tax_rules')return await readTaxRules(ctx,company,input);
 if(input.action==='tax_sources')return await listTaxSources(ctx,company,input);
 if(input.action==='tax_source')return await taxSourceDetails(ctx,company,input);
 if(input.action==='tax_return')return await taxReturnReport(ctx,company,input);
 if(input.action==='payroll_position')return await payrollPosition(ctx,company,input);
 if(input.action==='tax_withholding_schedule')return await withholdingSchedule(ctx,company,input);
 if(input.action==='tax_corporate_basis')return await withFinanceLock(ctx,company,fresh=>corporateTaxBasis(ctx,fresh,input));
 financePermission(ctx,input.action==='save_tax_rule'?'finance_accounts_manage':'finance_edit');
 const writers={save_tax_rule:saveTaxRule,assess_invoice_tax:assessInvoiceTax,assess_payroll_tax:assessPayrollTax,assess_corporate_tax:assessCorporateTax},result=await withFinanceLock(ctx,company,fresh=>writers[input.action](ctx,fresh,input));
 if(!result.replayed)await audit(ctx.base44,ctx.user,result.previous?'update':'create',result.rule?'FinanceTaxRule':'FinanceTaxAssessment',`Reviewed tax calculation: ${input.action}`,{entityId:result.rule?.id||result.assessment?.id,entityName:result.rule?.name||result.assessment?.source_label,changes:{previous:result.previous,revision:result.assessment?.revision,rule_id:result.rule?.id,rule_version:result.rule?.version,tax_units:result.assessment?.tax_units,base_units:result.assessment?.base_units}});
 return result;
}