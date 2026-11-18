import { Button } from '@/components/ui/button';
import TransactionJournalLines from '@/components/finance/transactions/TransactionJournalLines';
export default function TransactionAuditDetails({row,company,onInspect}){
 return <div className="space-y-4 p-4">
  {row.mapping&&<div className="space-y-1"><p className="text-sm font-medium">Automatic routing: {row.mapping.reason}</p><p className="text-xs text-muted-foreground">Checked for {row.mapping.checked_date}. A posted journal does not prove that recurring routing exists.</p></div>}
  <div className="space-y-1"><p className="text-sm">{row.reason}</p><p className="text-xs text-muted-foreground">Evidence: {row.reason_evidence}</p>{row.status!=='posted'&&<p className="text-sm text-muted-foreground">Suggested next step: {row.suggestion}</p>}</div>
  {row.journal_entries?.map(entry=><section key={entry.id} className="rounded-md border bg-background p-3 space-y-2"><h4 className="text-sm font-semibold">{entry.kind}</h4><p className="text-xs text-muted-foreground break-all">Journal: {entry.id}</p><TransactionJournalLines entry={entry} company={company}/></section>)}
  {!row.journal_entries?.length&&<p className="text-sm text-muted-foreground">No journal lines recorded. Inspect the transaction to review recovery options.</p>}
  <div className="text-xs text-muted-foreground space-y-1">{row.sources.map(s=><p key={`${s.entity}:${s.id}`} className="break-all">{s.name} · {s.id}</p>)}</div>
  <Button variant="outline" onClick={onInspect}>{row.status==='posted'?'Inspect journal / future mapping':'Inspect / recover'}</Button>
 </div>;
}