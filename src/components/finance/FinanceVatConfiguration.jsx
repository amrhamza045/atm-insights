import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import FinanceTaxSettings from '@/components/finance/FinanceTaxSettings';
export default function FinanceVatConfiguration({company,can}){
 const query=useQuery({queryKey:['finance','vat-configuration',company.id],queryFn:()=>financeCall({action:'tax_config',company_id:company.id})});
 if(query.isPending)return <p role="status" className="text-sm">Loading VAT account mappings…</p>;
 if(query.error)return <p role="alert" className="text-sm text-destructive">{financeError(query.error)} <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></p>;
 return <FinanceTaxSettings key={query.data.config?.updated_date||'unconfigured'} company={company} can={can} mappings={query.data.mappings}/>;
}