import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { companyToday } from '@/components/utils/timezoneHelper';
import SupplierAccountChoices from '@/components/purchasing/supplierAccounts/SupplierAccountChoices';
import { supplierAccountCall, supplierError, refreshSupplierAccounts } from '@/components/purchasing/supplierAccounts/supplierAccountApi';
export default function SupplierOpeningForm({scope, resume, defaults = {}, onClose}) {
  const client = useQueryClient();
  const [data, setData] = useState({amount: resume?.delta ?? defaults.amount ?? '', entry_date: resume?.entry_date || defaults.entry_date || companyToday(), notes: resume?.notes || '', offset_account_id: resume?.account_snapshot?.offset_account_id || defaults.offset_account_id || '', already_in_gl: resume?.account_snapshot?.already_in_gl || false, confirmed: false});
  const set = (key, value) => setData({...data, [key]: value});
  const save = useMutation({mutationFn: () => supplierAccountCall({...scope, ...data, amount: Number(data.amount), action: 'opening'}), onSuccess: () => {refreshSupplierAccounts(client); onClose();}});
  return <form className="rounded-lg border bg-card p-4 space-y-3" onSubmit={e => {e.preventDefault(); save.mutate();}}>
    <h4 className="font-semibold">Enter opening balance</h4><p className="text-sm text-muted-foreground">This is the total owed at the end of the cutoff date. Earlier invoices are covered by it and cannot be imported again. Enter zero if all earlier invoices were settled.</p>
    <div className="grid gap-3 sm:grid-cols-2"><Label className="space-y-1">Opening payable (EGP)<Input type="number" min="0" step="0.01" required value={data.amount} onChange={e => set('amount', e.target.value)} /></Label><Label className="space-y-1">Cutoff date<Input type="date" required value={data.entry_date} onChange={e => set('entry_date', e.target.value)} /></Label></div>
    <Label className="block space-y-1">Supporting reference / explanation<Input required minLength={5} maxLength={1000} value={data.notes} onChange={e => set('notes', e.target.value)} /></Label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={data.already_in_gl} onChange={e => set('already_in_gl', e.target.checked)} />This opening liability is already included in the general ledger. Do not post it again.</label>
    {!data.already_in_gl && Number(data.amount) > 0 && <div className="space-y-1"><Label>Equity opening-balance offset</Label><SupplierAccountChoices type="offsets" scope={scope} value={data.offset_account_id} onChange={v => set('offset_account_id', v)} /></div>}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" required checked={data.confirmed} onChange={e => set('confirmed', e.target.checked)} />I verified this cutoff and excluded invoices imported separately. The opening balance will not be overwritten later.</label>
    {save.error && <p role="alert" className="text-sm text-destructive">{supplierError(save.error)}</p>}
    <div className="flex gap-2"><Button disabled={save.isPending || !data.confirmed}>{save.isPending ? 'Saving…' : 'Save opening balance'}</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button></div>
  </form>;
}