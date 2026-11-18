import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { companyToday } from '@/components/utils/timezoneHelper';
import { formatCurrency } from '@/components/utils/currencyFormatter';
import SupplierPaymentFields from '@/components/purchasing/supplierAccounts/SupplierPaymentFields';
export default function SupplierInvoicePostForm({invoice, pending, error, onSubmit}) {
  const [mode, setMode] = useState('credit'), [due, setDue] = useState('');
  const [payment, setPayment] = useState({amount: invoice.total_amount, entry_date: companyToday(), payment_method: '', notes: `Initial payment for ${invoice.invoice_number}`});
  const [requestKey] = useState(() => crypto.randomUUID());
  const scope = {supplier_id: invoice.supplier_id, branch_id: invoice.branch_id};
  return <form className="space-y-4" onSubmit={e => {e.preventDefault(); onSubmit({...payment, amount: mode === 'credit' ? 0 : mode === 'full' ? invoice.total_amount : Number(payment.amount), mode, due_date: due, request_key: requestKey});}}>
    <p className="text-sm text-muted-foreground">Posting receives stock and adds {formatCurrency(invoice.total_amount)} to this supplier’s account. Choose how it is settled.</p>
    <Label className="block space-y-1">Settlement<select className="w-full rounded-md border border-input bg-background p-2 text-sm" disabled={pending} value={mode} onChange={e => setMode(e.target.value)}><option value="credit">Deferred / on credit</option><option value="full">Immediate full payment</option><option value="partial">Immediate partial payment</option></select></Label>
    {mode !== 'full' && <Label className="block space-y-1">Balance due date (optional)<Input type="date" min={invoice.invoice_date} value={due} disabled={pending} onChange={e => setDue(e.target.value)} /></Label>}
    {mode !== 'credit' && <SupplierPaymentFields scope={scope} value={{...payment, amount: mode === 'full' ? invoice.total_amount : payment.amount}} onChange={setPayment} disabled={pending} fixedAmount={mode === 'full'} max={invoice.total_amount} />}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={pending}>{pending ? 'Posting…' : mode === 'credit' ? 'Post on credit' : 'Post invoice and record payment'}</Button>
    {mode !== 'credit' && <p className="text-xs text-muted-foreground">Records a payment already made; no bank transfer is initiated.</p>}
  </form>;
}