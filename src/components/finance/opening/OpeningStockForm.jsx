import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { financeCall, financeError } from '@/components/finance/financeApi';
import OpeningItemSelect from '@/components/finance/opening/OpeningItemSelect';

const EMPTY = { item: null, quantity: '', unit_cost: '', notes: '' };
const SELECT = 'block w-full border rounded-md p-2 bg-background mt-1 font-normal';
// Same unit rules the server uses: quantity in the stock unit, cost per the cost unit.
const stockUnit = (i) => String(i?.selling_unit_label || i?.unit || '').trim() || (i?.selling_unit === 'weight' ? 'kg' : 'pcs');
const costUnit = (i) => String(i?.purchase_unit_label || i?.unit || i?.selling_unit_label || '').trim() || (i?.purchase_unit === 'weight' ? 'kg' : 'pcs');

export default function OpeningStockForm({ company, branches, data }) {
  const [form, setForm] = useState({ ...EMPTY, branch_id: '', cutoff_date: data.cutoff || '' });
  const qc = useQueryClient(), set = (v) => setForm((f) => ({ ...f, ...v })), item = form.item;
  const post = useMutation({
    mutationFn: () => financeCall({ action: 'opening_stock_post', company_id: company.id, branch_id: form.branch_id, inventory_item_id: item?.id, quantity: Number(form.quantity), unit_cost: Number(form.unit_cost), notes: form.notes, cutoff_date: data.cutoff || form.cutoff_date }),
    onSuccess: () => { setForm((f) => ({ ...f, ...EMPTY })); qc.invalidateQueries({ queryKey: ['finance'] }); },
  });
  return (
    <form className="rounded-lg border p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
      <div>
        <h4 className="font-semibold">Stock</h4>
        <p className="text-xs text-muted-foreground">One opening per stock item: the counted quantity is added to the item at its opening cost, and the value posts to the item's inventory account against opening balance equity.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {!data.cutoff && <Label>Cut-off date<Input required type="date" className="mt-1" value={form.cutoff_date} onChange={(e) => set({ cutoff_date: e.target.value })} /></Label>}
        <Label>Branch<select required className={SELECT} value={form.branch_id} onChange={(e) => set({ branch_id: e.target.value, item: null })}><option value="">Select branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Label>
        <OpeningItemSelect branchId={form.branch_id} value={item} onChange={(v) => set({ item: v })} />
        <Label>Counted quantity{item ? ` (${stockUnit(item)})` : ''}<Input required type="number" min="0.0001" step="any" className="mt-1" value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} /></Label>
        <Label>Cost per {item ? costUnit(item) : 'cost unit'} ({company.currency})<Input required type="number" min="0.0001" step="any" className="mt-1" value={form.unit_cost} onChange={(e) => set({ unit_cost: e.target.value })} /></Label>
        <Label className="sm:col-span-2">Evidence reference<Input required minLength={3} maxLength={500} className="mt-1" placeholder="Stock count sheet reference" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Label>
      </div>
      {item && !item.category_id && <p className="text-sm text-warning-700">This item has no inventory category. Give it one in Inventory first.</p>}
      {post.error && <p role="alert" className="text-sm text-destructive">{financeError(post.error)}</p>}
      {post.isSuccess && <p role="status" className="text-sm text-success-700">Opening stock posted and added to the item.</p>}
      <Button type="submit" disabled={post.isPending || !data.equity.length || !item?.category_id}>{post.isPending ? 'Posting…' : 'Post opening stock'}</Button>
    </form>
  );
}