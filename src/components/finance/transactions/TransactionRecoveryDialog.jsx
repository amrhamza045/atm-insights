import { useState } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
import TransactionFutureRouting from '@/components/finance/transactions/TransactionFutureRouting';
import TransactionRoutingPreview from '@/components/finance/transactions/TransactionRoutingPreview';
import TransactionOneTime from '@/components/finance/transactions/TransactionOneTime';
import TransactionPostedReceipt from '@/components/finance/transactions/TransactionPostedReceipt';
export default function TransactionRecoveryDialog({company,row,can,onClose}){
 const [mode,setMode]=useState('routing'),qc=useQueryClient();
 const query=useQuery({queryKey:['finance','transaction-inspect',company.id,row.source_entity,row.id],queryFn:()=>financeCall({action:'transaction_inspect',company_id:company.id,source_entity:row.source_entity,source_id:row.id})});
 const d=query.data,open=d&&!d.journals.length&&!d.proposals.length;
 return <Dialog open onOpenChange={v=>!v&&onClose()}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Transaction audit and recovery</DialogTitle><DialogDescription>{row.source_name} · {row.id}</DialogDescription></DialogHeader>
 {query.isPending&&<p role="status">Inspecting source and current routing…</p>}{query.error&&<p role="alert" className="text-sm text-destructive">{financeError(query.error)}</p>}<Button variant="outline" disabled={query.isFetching} onClick={()=>{qc.invalidateQueries({queryKey:['finance']});query.refetch();}}>Refresh transaction status</Button>
 {d&&<><p className="text-sm font-medium">{d.reason}</p><p className="text-sm text-muted-foreground">{d.suggestion}</p>{d.journals.map(j=><TransactionPostedReceipt key={j.id} company={company} journalId={j.id}/>)}{d.proposals.length>0&&<div className="border rounded-lg p-3 space-y-2"><p className="text-sm">Pending independent review, not posted. Proposal IDs: {d.proposals.map(p=>p.id).join(', ')}</p><Link className="text-sm underline text-primary" to="/Finance?finance_view=reporting&tab=proposals" onClick={onClose}>Open Pending review</Link><p className="text-xs text-muted-foreground">After a different authorized reviewer approves, reopen this transaction and verify its posted journal here.</p></div>}
 <TransactionFutureRouting company={company} detail={d} can={can}/>
  {open&&<><div className="flex flex-wrap gap-2" role="group" aria-label="Recovery method"><Button variant={mode==='routing'?'default':'outline'} onClick={()=>setMode('routing')}>Routing and automated recovery</Button>{can('finance_journal_create')&&<Button variant={mode==='one_time'?'default':'outline'} onClick={()=>setMode('one_time')}>One-time journal without routing</Button>}</div>
 {mode==='one_time'?<TransactionOneTime company={company} detail={d}/>:<> {d.routing.kind==='inventory'?<p className="text-sm border rounded-lg p-3">Stock rows recover through the posting engine, not this preview: once routing is configured, use Retry in Posting issues and the journal posts at its recorded cost.</p>:d.routing.kind==='unsupported'?<p className="text-sm border rounded-lg p-3">This source has no verified live automatic adapter. Use a one-time journal for independent review after reconciling its accounting effect; saving a blueprint alone will not activate posting.</p>:<TransactionRoutingPreview company={company} detail={d} can={can}/>}</>}</>}
 </>}
 </DialogContent></Dialog>;
}