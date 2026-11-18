import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeError } from '@/components/finance/financeApi';
import financePreparedCall from '@/components/finance/financePreparedCall';
import CorporateTaxForm from '@/components/finance/tax/CorporateTaxForm';
export default function CorporateTaxWorking({company,filters}){
 const query=useQuery({queryKey:['finance','corporate-tax-basis',company.id,filters],queryFn:({signal})=>financePreparedCall({action:'tax_corporate_basis',company_id:company.id,...filters},signal)}),basis=query.data;
 return <section className="space-y-3"><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>Refresh posted corporate tax basis</Button>{query.isPending&&<p>Preparing company-ledger profit before tax…</p>}{query.error&&<p role="alert" className="text-sm text-destructive">{financeError(query.error)}</p>}{basis?.ready===false&&<p>Preparing {basis.remaining} remaining journals; refresh to continue.</p>}{basis?.ready&&<CorporateTaxForm key={`${basis.source_version}:${basis.assessment?.revision||0}`} company={company} basis={basis}/>}</section>;
}