import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const SELECT = 'block w-full border rounded-md p-2 bg-background font-normal';
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Stock items of one branch, searched by name on the server.
export default function OpeningItemSelect({ branchId, value, onChange }) {
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['finance', 'opening-items', branchId, search],
    queryFn: () => base44.entities.InventoryItem.filter(
      { branch_id: branchId, ...(search.trim() ? { name: { $regex: escape(search.trim()), $options: 'i' } } : {}) },
      { sort: 'name', limit: 50 }
    ),
    enabled: !!branchId,
  });
  const items = query.data?.items || [];
  return (
    <div className="space-y-1 text-sm">
      <span className="font-medium">Stock item</span>
      <Input placeholder={branchId ? 'Search stock items' : 'Select a branch first'} disabled={!branchId} value={search} onChange={(e) => setSearch(e.target.value)} />
      <select required aria-label="Stock item" className={SELECT} disabled={!branchId} value={value?.id || ''} onChange={(e) => onChange(items.find((i) => i.id === e.target.value) || null)}>
        <option value="">{query.isFetching ? 'Loading…' : `Select item (${items.length}${query.data?.has_more ? '+, refine the search' : ''})`}</option>
        {value && !items.some((i) => i.id === value.id) && <option value={value.id}>{value.name}</option>}
        {items.map((i) => <option key={i.id} value={i.id}>{i.name}{i.category_name ? ` · ${i.category_name}` : ' · no category'}</option>)}
      </select>
    </div>
  );
}