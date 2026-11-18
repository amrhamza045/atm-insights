import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CustodyActionDialog({ dialog, employees, activeIds, paymentMethods = [], onClose, onSubmit, busy }) {
  const isFund = dialog.type === 'fund';
  const c = dialog.custody;
  const availableEmps = employees.filter((e) => !activeIds.includes(e.id));

  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods.find((m) => m.is_default)?.code || paymentMethods[0]?.code || '');
  const [notes, setNotes] = useState('');
  const [closeCustody, setCloseCustody] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const amt = Number(amount) || 0;
  const invalidReturn = !isFund && c && amt > Number(c.balance) + 1e-9;

  const submit = () => {
    onSubmit({
      action: isFund ? 'custody_fund' : 'custody_return',
      data: {
        date,
        notes,
        amount: amt,
        payment_method: paymentMethod,
        ...(c ? { custody_id: c.id } : { employee_id: employeeId }),
        ...(isFund ? {} : { close: closeCustody }),
      },
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isFund ? (c ? `Replenish Custody · ${c.employee_name}` : 'Open & Fund Staff Custody') : `Return / Close Custody · ${c?.employee_name}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {!c && isFund && (
            <div>
              <label className="text-sm font-medium">Employee</label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {availableEmps.length === 0 ? (
                    <SelectItem value="none" disabled>All employees already hold an active custody</SelectItem>
                  ) : (
                    availableEmps.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Amount ({c?.currency || 'EGP'})</label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={isFund ? '0.00' : `Max ${Number(c?.balance || 0).toFixed(2)}`} />
              {invalidReturn && <p className="text-xs text-destructive mt-1">Exceeds available custody balance.</p>}
            </div>
          </div>
          {amt > 0 && (
            <div>
              <label className="text-sm font-medium">{isFund ? 'Fund from (Payment Method)' : 'Return to (Payment Method)'}</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.length === 0 ? (
                    <SelectItem value="none" disabled>No active payment methods configured</SelectItem>
                  ) : (
                    paymentMethods.map((m) => <SelectItem key={m.code} value={m.code}>{m.name} ({m.code})</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isFund && (
            <div className="flex items-center gap-2 bg-muted p-3 rounded border">
              <input type="checkbox" id="closeCustody" checked={closeCustody} onChange={(e) => setCloseCustody(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="closeCustody" className="text-sm">Close custody (balance after return must be 0.00)</label>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Notes / Evidence</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reference or reason" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={busy || invalidReturn || (!c && !employeeId) || (c && isFund && amt <= 0) || (!isFund && amt <= 0 && !closeCustody) || (amt > 0 && !paymentMethod)}
            >
              {busy ? 'Saving…' : isFund ? (c ? 'Replenish' : 'Open Custody') : closeCustody && amt === 0 ? 'Close Custody' : 'Confirm Return'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}