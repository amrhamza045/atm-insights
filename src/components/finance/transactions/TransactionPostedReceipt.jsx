import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import TransactionJournalLines from '@/components/finance/transactions/TransactionJournalLines';
export default function TransactionPostedReceipt({company,journalId}){
 const verify=useQuery({queryKey:['finance','transaction-verify',company.id,journalId],queryFn:()=>financeCall({action:'transaction_verify',company_id:company.id,journal_id:journalId})});
 return <div className="border rounded-lg p-3 space-y-3"><p className="text-sm break-all">Posted journal: {journalId}</p><Button variant="outline" disabled={verify.isFetching} onClick={()=>verify.refetch()}>{verify.isFetching?'Verifying…':'Verify journal and ledger lines'}</Button>{verify.error&&<p role="alert" className="text-sm text-destructive">{financeError(verify.error)}</p>}{verify.data?.verified&&<><p role="status" className="text-sm font-semibold">Confirmed: journal is posted and every reporting line is present.</p><TransactionJournalLines entry={verify.data} company={company}/></>}</div>;
}