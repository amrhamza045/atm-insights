import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/components/utils/currencyFormatter';
import { supplierAccountCall, supplierError, refreshSupplierAccounts } from '@/components/purchasing/supplierAccounts/supplierAccountApi';
export default function SupplierReviewForm({scope, invoice, onClose}) {
  const client = useQueryClient();
  const [paid, setPaid] = useState(invoice.pending ? invoice.reviewed_paid ?? '' : ''), [notes, setNotes] = useState(invoice.pending ? invoice.review_notes : ''), [due, setDue] = useState(invoice.due_date || ''), [confirmed, setConfirmed] = useState(false);
  const save = useMutation({mutationFn: () => supplierAccountCall({...scope, action: 'review_invoice', invoice_id: invoice.id, paid: Number(paid), due_date: due, notes}), onSuccess: () => {refreshSupplierAccounts(client); onClose();}});
  return <form className="rounded-lg border bg-card p-4 space-y-3" onSubmit={e => {e.preventDefault(); save.mutate();}}>
    <h4 className="font-semibold">Review {invoice.invoice_number}</h4><p className="text-sm text-muted-foreground">Invoice total: {formatCurrency(invoice.total_amount)}. Enter what was already paid, including zero if wholly unpaid. No stock or historical cash movement will be repeated.</p>
    <Label className="block space-y-1">Previously paid (EGP)<Input type="number" min="0" max={invoice.total_amount} step="0.01" value={paid} onChange={e => setPaid(e.target.value)} required /></Label>
    <Label className="block space-y-1">Due date (optional)<Input type="date" min={invoice.invoice_date} value={due} onChange={e => setDue(e.target.value)} /></Label>
    <Label className="block space-y-1">Evidence / review note<Input value={notes} minLength={5} maxLength={1000} onChange={e => setNotes(e.target.value)} required /></Label>
    {paid !== '' && <p className="text-sm">Remaining payable: {formatCurrency(Math.max(0, invoice.total_amount - Number(paid)))}</p>}
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />I verified the paid amount and this invoice is not included in an opening balance.</label>
    {save.error && <p role="alert" className="text-sm text-destructive">{supplierError(save.error)}</p>}
    <div className="flex gap-2"><Button disabled={save.isPending || !confirmed}>{save.isPending ? 'Saving…' : 'Confirm reviewed balance'}</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button></div>
  </form>;
}