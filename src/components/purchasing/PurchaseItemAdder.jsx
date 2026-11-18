import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import PurchaseUnitSelect from '@/components/purchasing/PurchaseUnitSelect';
import { getItemCostUnit, normalizeUnit } from '@/lib/unitConversion';
import { purchaseUnitOptions, purchaseUnitPrice } from '@/components/purchasing/purchaseUnits';
import { formatCurrency } from '@/components/utils/currencyFormatter';

export default function PurchaseItemAdder({ item, catalog, rules, invoices, loading, onAdd }) {
  const [chosen, setChosen] = useState('');
  const unit = chosen || normalizeUnit(getItemCostUnit(item));
  const valid = purchaseUnitOptions(item, catalog, rules).some(u => u.code === unit);
  return <div className="p-2 rounded border border-border space-y-2">
    <p className="font-medium text-sm">{item.name}</p>
    <div className="flex items-start gap-2">
      <PurchaseUnitSelect item={item} value={unit} catalog={catalog} rules={rules} onChange={setChosen} disabled={loading} />
      <Button size="sm" variant="outline" disabled={loading || !valid} onClick={() => onAdd(item, unit)}>Add item</Button>
    </div>
    <p className="text-xs text-muted-foreground">{loading ? 'Loading units…' : `${formatCurrency(purchaseUnitPrice(item, unit, invoices, rules))}/${unit}`}</p>
  </div>;
}