import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { companyToday } from '@/components/utils/timezoneHelper';
import { formatCurrency } from '@/components/utils/currencyFormatter';
import SupplierPaymentFields from '@/components/purchasing/supplierAccounts/SupplierPaymentFields';
import { supplierAccountCall, supplierError, refreshSupplierAccounts } from '@/components/purchasing/supplierAccounts/supplierAccountApi';
export default function SupplierPaymentForm({scope, invoice, balance, resume, onClose}) {
  const client = useQueryClient(), max = invoice?.outstanding ?? balance;
  const [value, setValue] = useState({amount: resume ? -resume.delta : max, entry_date: resume?.entry_date || companyToday(), payment_method: resume?.payment_method || '', notes: resume?.notes || `Payment for ${invoice?.invoice_number || 'opening balance'}`});
  const [requestKey] = useState(() => resume?.entry_key.replace(/^payment:/, '') || crypto.randomUUID());
  const save = useMutation({mutationFn: () => supplierAccountCall({...scope, ...value, action: 'pay', amount: Number(value.amount), invoice_id: resume?.invoice_id || invoice?.id || '', request_key: requestKey}), onSuccess: () => {refreshSupplierAccounts(client); onClose();}});
  return <form className="rounded-lg border bg-card p-4 space-y-4" onSubmit={e => {e.preventDefault(); save.mutate();}}>
    <h4 className="font-semibold">{resume ? 'Resume saved payment' : `Pay ${invoice?.invoice_number || 'opening balance'}`}</h4>
    {!resume && <p className="text-sm text-muted-foreground">Outstanding: {formatCurrency(max)}. Record the full amount or any partial amount.</p>}
    <SupplierPaymentFields scope={scope} value={value} onChange={setValue} disabled={save.isPending || !!resume} max={resume ? -resume.delta : max} />
    {save.error && <p role="alert" className="text-sm text-destructive">{supplierError(save.error)}</p>}
    <div className="flex gap-2"><Button disabled={save.isPending}>{save.isPending ? 'Recording…' : resume ? 'Resume payment' : 'Record payment'}</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button></div>
    <p className="text-xs text-muted-foreground">Records a payment already made; this does not initiate a bank transfer.</p>
  </form>;
}