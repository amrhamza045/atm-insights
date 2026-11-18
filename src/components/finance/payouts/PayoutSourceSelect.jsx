import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PayoutSourceSelect({ value, type, onChange, disabled, methods = [], custodies = [], requiredAmount }) {
  // value is the code (methods) or id (custodies)
  const isCustody = type === 'custody';

  return (
    <div className="flex gap-2 w-full">
      <Select value={type} onValueChange={t => onChange(null, t)} disabled={disabled}>
        <SelectTrigger className="w-[120px] shrink-0 text-xs h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="payment_method">Payment Method</SelectItem>
          <SelectItem value="custody">Staff Custody</SelectItem>
        </SelectContent>
      </Select>

      <Select value={value || ''} onValueChange={v => onChange(v, type)} disabled={disabled}>
        <SelectTrigger className="flex-1 text-xs h-8"><SelectValue placeholder={`Select ${isCustody ? 'custody' : 'method'}`} /></SelectTrigger>
        <SelectContent>
          {isCustody ? (
            custodies.length === 0 ? <SelectItem value="none" disabled>No active custodies</SelectItem> :
            custodies.map(c => {
              const insufficient = requiredAmount != null && c.balance < requiredAmount - 1e-9;
              return (
                <SelectItem key={c.id} value={c.id} disabled={insufficient} className={insufficient ? 'text-slate-400' : ''}>
                  {c.employee_name} — {c.currency} {c.balance.toFixed(2)}{insufficient ? ' (insufficient balance)' : ''}
                </SelectItem>
              );
            })
          ) : (
            methods.length === 0 ? <SelectItem value="none" disabled>No payment methods</SelectItem> :
            methods.map(m => (
              <SelectItem key={m.code} value={m.code}>{m.name}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}