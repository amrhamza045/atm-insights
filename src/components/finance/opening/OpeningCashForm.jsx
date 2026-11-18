import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { financeCall, financeError } from '@/components/finance/financeApi';

const EMPTY = { branch_id: '', payment_method_id: '', amount: '', notes: '' };
const SELECT = 'block w-full border rounded-md p-2 bg-background mt-1 font-normal';

export default function OpeningCashForm({ company, branches, data }) {
  const [form, setForm] = useState({ ...EMPTY, cutoff_date: data.cutoff || '' });
  const qc = useQueryClient(), set = (v) => setForm((f) => ({ ...f, ...v }));
  const post = useMutation({
    mutationFn: () => financeCall({ action: 'opening_cash_post', company_id: company.id, ...form, cutoff_date: data.cutoff || form.cutoff_date, amount: Number(form.amount) }),
    onSuccess: () => { setForm((f) => ({ ...EMPTY, cutoff_date: f.cutoff_date })); qc.invalidateQueries({ queryKey: ['finance'] }); },
  });
  return (
    <form className="rounded-lg border p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
      <div>
        <h4 className="font-semibold">Cash and bank</h4>
        <p className="text-xs text-muted-foreground">One opening balance per payment method and branch, posted to its cash or bank account against opening balance equity.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {!data.cutoff && <Label>Cut-off date<Input required type="date" className="mt-1" value={form.cutoff_date} onChange={(e) => set({ cutoff_date: e.target.value })} /></Label>}
        <Label>Branch<select required className={SELECT} value={form.branch_id} onChange={(e) => set({ branch_id: e.target.value })}><option value="">Select branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Label>
        <Label>Payment method<select required className={SELECT} value={form.payment_method_id} onChange={(e) => set({ payment_method_id: e.target.value })}><option value="">Select method</option>{data.methods.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.account_code}</option>)}</select></Label>
        <Label>Balance at cut-off ({company.currency})<Input required type="number" min="0.01" step="0.01" className="mt-1" value={form.amount} onChange={(e) => set({ amount: e.target.value })} /></Label>
        <Label className="sm:col-span-2">Evidence reference<Input required minLength={3} maxLength={500} className="mt-1" placeholder="Bank statement or cash count reference" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Label>
      </div>
      {post.error && <p role="alert" className="text-sm text-destructive">{financeError(post.error)}</p>}
      {post.isSuccess && <p role="status" className="text-sm text-success-700">Opening balance posted.</p>}
      <Button type="submit" disabled={post.isPending || !data.equity.length}>{post.isPending ? 'Posting…' : 'Post opening balance'}</Button>
    </form>
  );
}