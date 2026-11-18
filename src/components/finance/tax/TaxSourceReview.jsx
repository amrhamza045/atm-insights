import { useQuery } from '@tanstack/react-query';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import InvoiceTaxForm from '@/components/finance/tax/InvoiceTaxForm';
import PayrollTaxForm from '@/components/finance/tax/PayrollTaxForm';
export default function TaxSourceReview({company,selection,onClose}){
 const query=useQuery({queryKey:['finance','tax-source',company.id,selection],queryFn:()=>financeCall({action:'tax_source',company_id:company.id,...selection})}),data=query.data;
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{selection.source_entity==='SalaryRecord'?'Review payroll tax':'Review individual sales / purchase line taxes'}</DialogTitle></DialogHeader>{query.isPending&&<p>Loading source records…</p>}{query.error&&<p role="alert" className="text-destructive text-sm">{financeError(query.error)} <Button variant="outline" onClick={()=>query.refetch()}>Retry</Button></p>}{!data&&<Button variant="outline" onClick={onClose}>Close</Button>}{data&&(selection.source_entity==='SalaryRecord'?<PayrollTaxForm key={`${data.source.updated_date}:${data.assessment?.revision}`} company={company} selection={selection} data={data} onClose={onClose}/>:<InvoiceTaxForm key={`${data.source.updated_date}:${data.assessment?.revision}`} company={company} selection={selection} data={data} onClose={onClose}/>)}</DialogContent></Dialog>;
}