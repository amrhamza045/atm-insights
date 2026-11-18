import React from 'react';
import { purchaseUnitOptions } from '@/components/purchasing/purchaseUnits';

export default function PurchaseUnitSelect({ item, value, catalog, rules, onChange, disabled = false }) {
  const options = item ? purchaseUnitOptions(item, catalog, rules) : [];
  return <div className="space-y-1">
    <select aria-label={`Purchase unit for ${item?.name || 'item'}`} value={value || ''}
      disabled={disabled || !item} onChange={e => onChange(e.target.value)}
      className="w-full rounded-md border border-input bg-background text-foreground px-2 py-1 text-sm">
      {!options.some(u => u.code === value) && <option value={value || ''}>{value || 'Select unit'}</option>}
      {options.map(u => <option key={u.code} value={u.code}>{u.label || u.code}</option>)}
    </select>
    {!disabled && item && !options.length && <p className="text-xs text-destructive">Define a conversion between this item's purchase and stock units before ordering.</p>}
  </div>;
}