import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useHasAnyPermission } from '@/components/permissions/PermissionsContext';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import SupplierAccountPanel from '@/components/purchasing/supplierAccounts/SupplierAccountPanel';
export default function SupplierAccountsWorkspace() {
  const [supplierId, setSupplierId] = useState(''), [search, setSearch] = useState('');
  const canRead = useHasAnyPermission(['purchase_view','purchase_edit','purchase_approve','financial_view','finance_edit']);
  const term = useDebouncedValue(search, 250), escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const q = useInfiniteQuery({queryKey: ['supplier-account-choices', term], initialPageParam: undefined, enabled: canRead, queryFn: ({pageParam}) => base44.entities.Supplier.filter(escaped ? {name: {$regex: escaped, $options: 'i'}} : {}, {sort: 'name', limit: 25, ...(pageParam ? {cursor: pageParam} : {})}), getNextPageParam: p => p.has_more ? p.next_cursor : undefined});
  if (!canRead) return null;
  const items = q.data?.pages.flatMap(p => p.items) || [];
  return <div className="space-y-4"><h2 className="text-xl font-semibold">Supplier invoice balances and payments</h2><div className="grid gap-2 sm:grid-cols-2"><Input aria-label="Search supplier accounts" placeholder="Search suppliers" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Select supplier account" className="rounded-md border border-input bg-background p-2 text-sm" value={supplierId} onChange={e => setSupplierId(e.target.value)}><option value="">Select a supplier</option>{supplierId && !items.some(s => s.id === supplierId) && <option value={supplierId}>Selected supplier</option>}{items.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    {q.isPending && <p role="status" className="text-sm">Loading suppliers…</p>}{q.error && <p role="alert" className="text-sm text-destructive">Could not load suppliers. <Button variant="link" onClick={() => q.refetch()}>Retry</Button></p>}{q.hasNextPage && <Button variant="outline" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Load more suppliers</Button>}
    {supplierId ? <SupplierAccountPanel key={supplierId} supplierId={supplierId} /> : <p className="text-sm text-muted-foreground">Choose a supplier to review existing invoices, enter an opening balance or record a full or partial payment.</p>}
  </div>;
}