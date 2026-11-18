import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/components/utils/currencyFormatter';
import { supplierAccountCall, supplierError } from '@/components/purchasing/supplierAccounts/supplierAccountApi';
export default function SupplierAccountInvoices({scope, canWrite, onAction}) {
  const q = useInfiniteQuery({queryKey: ['supplier-accounts', scope, 'invoices'], initialPageParam: undefined, queryFn: ({pageParam}) => supplierAccountCall({...scope, action: 'invoices', cursor: pageParam}), getNextPageParam: p => p.has_more ? p.next_cursor : undefined});
  const items = q.data?.pages.flatMap(p => p.items) || [];
  return <div className="space-y-2"><h4 className="font-semibold">Posted invoices</h4>{q.isPending && <p role="status">Loading invoices…</p>}{q.error && <p role="alert" className="text-destructive">{supplierError(q.error)} <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>}
    {q.isSuccess && !items.length && <p className="text-sm text-muted-foreground">No posted invoices for this supplier and branch.</p>}
    {items.map(i => <div key={i.id} className="rounded-md border p-3 flex flex-wrap items-center justify-between gap-3"><div className="space-y-1"><p className="font-medium break-all">{i.invoice_number}</p><p className="text-xs text-muted-foreground">{i.invoice_date} · Total {formatCurrency(i.total_amount)}{i.due_date ? ` · Due ${i.due_date}` : ''}</p>
      <p className="text-sm">{i.covered ? 'Covered by opening balance' : i.pending ? 'Review incomplete; resume with the same reviewed amounts' : !i.registered ? 'Payment history unknown — review required' : `Paid ${formatCurrency(i.paid)} · Returned ${formatCurrency(i.returned)} · ${i.outstanding < 0 ? 'Supplier credit' : 'Outstanding'} ${formatCurrency(Math.abs(i.outstanding))} · ${i.outstanding <= 0 ? 'Settled / credited' : i.paid > 0 ? 'Partially paid' : 'Unpaid / on credit'}`}</p></div>
      {canWrite && !i.covered && <div className="flex flex-wrap gap-2">{!i.registered ? <Button size="sm" variant="outline" onClick={() => onAction({kind: 'review', invoice: i})}>Review invoice</Button> : i.outstanding > 0 && <Button size="sm" onClick={() => onAction({kind: 'pay', invoice: i})}>Record payment</Button>}{i.returnable && <Button size="sm" variant="outline" onClick={() => onAction({kind:'return',invoice:i})}>Return goods</Button>}</div>}</div>)}
    {q.hasNextPage && <Button variant="outline" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{q.isFetchingNextPage ? 'Loading…' : 'Load more invoices'}</Button>}
  </div>;
}