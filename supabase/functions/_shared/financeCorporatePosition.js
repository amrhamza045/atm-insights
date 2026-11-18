import { reportUnits } from './financeAnalyticsScope.js';
export function corporatePosition(basis){
 const a=basis.assessment,c=a?.calculation||{},known=n=>typeof n==='number'&&Number.isSafeInteger(n),value=n=>known(n)?n:null;
 const complete=!!a&&['profit_units','addbacks_units','deductions_units','losses_units','credits_units','gross_tax_units'].every(k=>known(c[k]))&&known(a.base_units)&&known(a.tax_units);
 const adjusted=complete?reportUnits(c.profit_units+c.addbacks_units-c.deductions_units):null;
 const inconsistent=complete&&(a.base_units!==Math.max(0,adjusted-c.losses_units)||a.tax_units!==c.gross_tax_units-c.credits_units);
 const changed=!!a&&a.source_version!==basis.source_version;
 const missingEvidence=!!a&&(!String(a.evidence_note||'').trim()||!String(c.rule?.legal_reference||'').trim());
 const paymentKnown=!!a&&a.recorded_tax_known===true&&known(a.recorded_tax_units)&&a.recorded_tax_units>=0;
 return {source_changed:changed,missing_evidence:missingEvidence,incomplete_calculation:!!a&&!complete,inconsistent_calculation:!!inconsistent,payments_known:paymentKnown,
  balance_units:complete&&!inconsistent&&!changed&&!missingEvidence&&!basis.duplicate_assessments&&paymentKnown?reportUnits(a.tax_units-a.recorded_tax_units):null,
  bridge:a?[
   {label:'Reviewed profit before tax',units:value(c.profit_units)},
   {label:'Non-deductible costs / add-backs (add)',units:value(c.addbacks_units)},
   {label:'Approved tax deductions (subtract)',units:value(c.deductions_units)},
   {label:'Adjusted profit before applied losses',units:adjusted},
   {label:'Eligible carried-forward losses applied (subtract)',units:value(c.losses_units)},
   {label:'Reviewed taxable profit',units:value(a.base_units)},
   {label:'Gross calculated corporate tax',units:value(c.gross_tax_units)},
   {label:'Eligible tax credits applied (subtract)',units:value(c.credits_units)},
   {label:'Calculated tax after applied credits',units:value(a.tax_units)},
   {label:'Recorded corporate tax payments',units:paymentKnown?a.recorded_tax_units:null}
  ]:[]};
}