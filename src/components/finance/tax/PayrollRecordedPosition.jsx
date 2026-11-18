import { useEffect,useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import PayrollPositionSummary from '@/components/finance/tax/PayrollPositionSummary';
import PayrollPositionTable from '@/components/finance/tax/PayrollPositionTable';
import PayrollReconciliationTable from '@/components/finance/tax/PayrollReconciliationTable';
import TaxSourceReview from '@/components/finance/tax/TaxSourceReview';
export default function PayrollRecordedPosition({company,filters,canEdit=false}){
  const enabled=company.currency==='EGP'&&!company.is_test,qc=useQueryClient(),[selection,setSelection]=useState(null);
 const query=useFinanceList({action:'payroll_position',company_id:company.id,...filters},enabled),meta=query.data?.pages[0];
 useEffect(()=>{
  if(!enabled)return;
  let timer;
  const unsubscribe=base44.entities.SalaryRecord.subscribe(()=>{clearTimeout(timer);timer=setTimeout(()=>qc.invalidateQueries({predicate:q=>q.queryKey[0]==='finance'&&q.queryKey[1]?.company_id===company.id&&(q.queryKey[1]?.action==='payroll_position'||q.queryKey[1]?.action==='tax_return'&&q.queryKey[1]?.return_kind==='payroll')}),2000);});
  return ()=>{clearTimeout(timer);unsubscribe();};
 },[company.id,enabled,qc]);
 if(!enabled)return <p className="text-sm text-muted-foreground">Live recorded payroll withholding is available for production EGP companies only; test payroll and currency conversion are not inferred.</p>;
 return <section className="border rounded-lg p-4 space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Live payroll withholding & deduction position</h3><p className="text-sm text-muted-foreground">Automatically reads current HR payroll for this company and authorized branches. Record withholding under HR → Payroll → Edit / Mark Paid.</p></div><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>Refresh payroll position</Button></div>{meta&&<><p className="text-xs text-muted-foreground">Monthly recognition dates {meta.from} to {meta.to} · {meta.currency}. Salary payment dates do not change the payroll month. Records with an unassigned branch cannot be attributed here.</p><PayrollPositionSummary company={company} data={meta}/><PayrollPositionTable company={company} items={query.items}/><PayrollReconciliationTable company={company} items={query.items} onReview={canEdit?r=>setSelection({source_entity:'SalaryRecord',source_id:r.id}):undefined}/></>}<FinanceListState query={query}/>{selection&&<TaxSourceReview company={company} selection={selection} onClose={()=>setSelection(null)}/>}<p className="text-xs text-muted-foreground">Changes flow into this live report automatically without creating extra tax assessments or ledger entries. Closed-period tax snapshots are not rewritten. Net salaries and original payment amounts stay unchanged.</p></section>;
}