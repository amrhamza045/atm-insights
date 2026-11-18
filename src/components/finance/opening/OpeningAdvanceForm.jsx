import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { financeCall, financeError } from '@/components/finance/financeApi';

// One opening advance for one event; a pending one is finished with the same values.
export default function OpeningAdvanceForm({ company, data, event, pending, onDone }) {
  const [form, setForm] = useState({ amount: pending?.amount ?? '', notes: pending?.notes || '', cutoff_date: data.cutoff || '' });
  const qc = useQueryClient(), set = (v) => setForm((f) => ({ ...f, ...v }));
  const post = useMutation({
    mutationFn: () => financeCall({ action: 'opening_advance_post', company_id: company.id, event_id: event.id, amount: Number(form.amount), notes: form.notes, cutoff_date: data.cutoff || form.cutoff_date }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); onDone(); },
  });
  return (
    <form className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm" onSubmit={(e) => { e.preventDefault(); post.mutate(); }}>
      {!data.cutoff && <Label>Cut-off date<Input required type="date" className="mt-1" value={form.cutoff_date} onChange={(e) => set({ cutoff_date: e.target.value })} /></Label>}
      <Label>Advance paid before the cut-off ({company.currency})<Input required type="number" min="0.01" step="0.01" className="mt-1" value={form.amount} onChange={(e) => set({ amount: e.target.value })} /></Label>
      <Label className="sm:col-span-2">Evidence reference<Input required minLength={3} maxLength={500} className="mt-1" placeholder="Receipt number or client ledger reference" value={form.notes} onChange={(e) => set({ notes: e.target.value })} /></Label>
      {post.error && <p role="alert" className="col-span-full text-destructive">{financeError(post.error)}</p>}
      <div className="col-span-full flex gap-2">
        <Button type="submit" disabled={post.isPending || !data.equity.length || !data.accounts?.advance}>{post.isPending ? 'Posting…' : 'Post opening advance'}</Button>
        <Button type="button" variant="outline" disabled={post.isPending} onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}