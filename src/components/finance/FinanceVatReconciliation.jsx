import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeError } from '@/components/finance/financeApi';
import financePreparedCall from '@/components/finance/financePreparedCall';
import FinanceTaxSettings from '@/components/finance/FinanceTaxSettings';
import FinanceVatSummary from '@/components/finance/FinanceVatSummary';
import FinanceTaxDocuments from '@/components/finance/FinanceTaxDocuments';
export default function FinanceVatReconciliation({company,filters,can,branches,showConfiguration=true}){
 const query=useQuery({queryKey:['finance','vat-reconciliation',company.id,filters],queryFn:({signal})=>financePreparedCall({action:'vat_reconciliation',company_id:company.id,...filters},signal),staleTime:30000}),data=query.data;
 return <section className="space-y-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-lg">Egypt ETA · VAT reconciliation</h2><Button variant="outline" disabled={query.isFetching} onClick={()=>query.refetch()}>{query.isFetching?'Refreshing…':'Refresh reconciliation'}</Button></div>{query.isPending&&<p className="text-sm">Preparing VAT reconciliation…</p>}{query.error&&<p role="alert" className="text-sm text-destructive">{financeError(query.error)}</p>}{data?.ready===false&&<p className="text-sm">Preparing the ledger: {data.remaining} journals remain. Refresh to continue.</p>}{data?.ready&&<>{showConfiguration&&<FinanceTaxSettings key={data.config?.updated_date||'unconfigured'} company={company} mappings={data.mappings} can={can}/>}{!data.configured&&<p className="text-sm text-muted-foreground">Ledger comparison is unavailable until valid VAT accounts are mapped under Configuration → VAT account mappings; register amounts remain provisional, not zero-filled ledger balances.</p>}<FinanceVatSummary data={data} company={company}/></>}<FinanceTaxDocuments company={company} filters={filters} can={can} branches={branches} vatMode/></section>;
}