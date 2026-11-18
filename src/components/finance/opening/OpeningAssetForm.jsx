import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import { financeCall, financeError, financeAmount } from '@/components/finance/financeApi';

const SELECT = 'block w-full border rounded-md p-2 bg-background mt-1 font-normal';
// The request ID makes a retry resume the same entry instead of posting the asset twice.
const blank = () => ({ request_id: crypto.randomUUID(), asset_name: '', asset: null, amount: '', depreciation: null, accumulated_depreciation: '', notes: '' });

export default function OpeningAssetForm({ company, branches, data }) {
  const [form, setForm] = useState(() => ({ ...blank(), branch_id: '', cutoff_date: data.cutoff || '' }));
  const qc = useQueryClient(), set = (v) => setForm((f) => ({ ...f, ...v }));
  const depreciation = Number(form.accumulated_depreciation) || 0;
  const post = useMutation({
    mutationFn: () => financeCall({ action: 'opening_asset_post', company_id: company.id, request_id: form.request_id, branch_id: form.branch_id, asset_name: form.asset_name, asset_account_id: form.asset?.account_id, amount: Number(form.amount), accumulated_depreciation: depreciation, depreciation_account_id: form.depreciation?.account_id, notes: form.notes, cutoff_date: data.cutoff || form.cutoff_date }),
    onSuccess: () => { setForm((f) => ({ ...f, ...blank() })); qc.invalidateQueries({ queryKey: ['finance'] }); },
  });
  return (
    <form className="rounded-lg border p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
      <div>
        <h4 className="font-semibold">Fixed assets and equipment</h4>
        <p className="text-xs text-muted-foreground">Post each asset or asset group at cost to its asset account. Accumulated depreciation, if any, goes to its own account; opening balance equity takes the net book value.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {!data.cutoff && <Label>Cut-off date<Input required type="date" className="mt-1" value={form.cutoff_date} onChange={(e) => set({ cutoff_date: e.target.value })} /></Label>}
        <Label>Branch<select required className={SELECT} value={form.branch_id} onChange={(e) => set({ branch_id: e.target.value })}><option value="">Select branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Label>
        <Label>Asset or group<Input required minLength={2} maxLength={200} className="mt-1" placeholder="e.g. Kitchen equipment" value={form.asset_name} onChange={(e) => set({ asset_name: e.target.value })} /></Label>
        <div className="space-y-1"><span className="font-medium">Asset account</span><FinanceAccountPicker companyId={company.id} classification="assets" value={form.asset} onChange={(a) => set({ asset: a })} /></div>
        <Label>Cost ({company.currency})<Input required type="number" min="0.01" step="0.01" className="mt-1" value={form.amount} onChange={(e) => set({ amount: e.target.value })} /></Label>
        <Label>Accumulated depreciation ({company.currency})<Input type="number" min="0" step="0.01" className="mt-1" placeholder="0" value={form.accumulated_depreciation} onChange={(e) => set({ accumulated_depreciation: e.target.value })} /></Label>
        {depreciation > 0 && <div className="space-y-1"><span className="font-medium">Depreciation account</span><FinanceAccountPicker companyId={company.id} classification="assets" value={form.depreciation} onChange={(a) => set({ depreciation: a })} /></div>}
        <Label className="sm:col-span-2">Evidence reference<Input required minLength={3} maxLength={500} className="mt-1" placeholder="Asset register or invoice reference" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Label>
      </div>
      {Number(form.amount) > 0 && <p className="text-sm text-muted-foreground">Net book value to equity: {financeAmount(Number(form.amount) - depreciation, company)}</p>}
      {post.error && <p role="alert" className="text-sm text-destructive">{financeError(post.error)}</p>}
      {post.isSuccess && <p role="status" className="text-sm text-success-700">Fixed asset opening posted.</p>}
      <Button type="submit" disabled={post.isPending || !data.equity.length || !form.asset || (depreciation > 0 && !form.depreciation)}>{post.isPending ? 'Posting…' : 'Post fixed asset'}</Button>
    </form>
  );
}