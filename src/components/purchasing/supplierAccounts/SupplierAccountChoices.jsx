import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { supplierAccountCall, supplierError } from '@/components/purchasing/supplierAccounts/supplierAccountApi';
export default function SupplierAccountChoices({scope, type = 'methods', value, onChange, disabled}) {
  const q = useInfiniteQuery({queryKey: ['supplier-accounts', scope, 'choices', type], initialPageParam: undefined, enabled: !!scope.branch_id && !!scope.supplier_id, queryFn: ({pageParam}) => supplierAccountCall({...scope, action: 'choices', type, cursor: pageParam}), getNextPageParam: p => p.has_more ? p.next_cursor : undefined});
  const items = q.data?.pages.flatMap(p => p.items) || [];
  return <div className="space-y-1"><select aria-label={type === 'methods' ? 'Payment method' : 'Opening balance offset account'} className="w-full rounded-md border border-input bg-background p-2 text-sm" value={value || ''} disabled={disabled || q.isPending || !!q.error} onChange={e => onChange(e.target.value)} required>
    <option value="">{type === 'methods' ? 'Choose an existing payment method' : 'Choose an equity offset account'}</option>
    {value && !items.some(i => (type === 'methods' ? i.code : i.id) === value) && <option value={value}>{value}</option>}
    {items.map(i => <option key={i.id} value={type === 'methods' ? i.code : i.id}>{type === 'methods' ? i.name : `${i.code} · ${i.name}`}</option>)}
  </select>{q.isPending && <p role="status" className="text-xs text-muted-foreground">Loading choices…</p>}{q.error && <p role="alert" className="text-xs text-destructive">{supplierError(q.error)} <Button variant="link" type="button" onClick={() => q.refetch()}>Retry</Button></p>}
    {q.isSuccess && !items.length && <p className="text-xs text-muted-foreground">{type === 'methods' ? 'No active payment methods. Use the existing Finance payment-method settings.' : 'No active equity posting accounts are available in this company.'}</p>}
    {q.hasNextPage && <Button variant="link" type="button" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Load more choices</Button>}
  </div>;
}