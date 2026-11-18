import { describe, it, expect } from 'vitest';
import { BUILTIN_UNITS } from '@/lib/unitConversion';
import { purchaseUnitOptions, purchaseUnitPrice, changePurchaseUnit } from '@/components/purchasing/purchaseUnits';
const item = { id: 'oil', purchase_unit_label: 'l', selling_unit_label: 'ml', cost_per_unit: 80 };
describe('PO units', () => {
  it('offers volume units, not unrelated mass or pieces', () => {
    const codes = purchaseUnitOptions(item, BUILTIN_UNITS).map(u => u.code);
    expect(codes).toContain('l'); expect(codes).toContain('ml');
    expect(codes).not.toContain('kg'); expect(codes).not.toContain('pcs');
  });
  it('converts prices by the invoice actual unit', () => {
    expect(purchaseUnitPrice(item, 'ml', [{ items: [{ inventory_item_id: 'oil', unit: 'l', purchase_price: 100 }] }])).toBe(0.1);
  });
  it('keeps value and demand units when changing cart purchase units', () => {
    const line = changePurchaseUnit({ quantity: 2, unit_price: 80, purchase_unit_label: 'l', unit: 'ml' }, 'ml', item);
    expect(line.quantity).toBe(2000); expect(line.unit_price).toBe(0.08); expect(line.unit).toBe('ml'); expect(line.total_price).toBe(160);
  });
  it('requires item-specific conversion to buy pieces for weight stock', () => {
    const chicken = { id: 'chicken', purchase_unit_label: 'kg', selling_unit_label: 'kg' };
    const rule = { scope: 'item', inventory_item_id: 'chicken', from_unit: 'pcs', to_unit: 'kg', factor: 2 };
    expect(purchaseUnitOptions(chicken, BUILTIN_UNITS, [rule]).map(u => u.code)).toContain('pcs');
    expect(() => changePurchaseUnit({ quantity: 1, purchase_unit_label: 'kg' }, 'pcs', chicken)).toThrow();
  });
});