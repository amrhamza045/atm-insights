import { requireValue, moneyUnits } from './financeValidation.js';
import { checkFreight } from './purchaseFreight.js';
export function supplierAmount(value, positive = false) {
  const units = moneyUnits(value, 2);
  requireValue(!positive || units > 0, 'Enter an amount greater than zero.');
  return units / 100;
}
export function supplierSettlement(total, paid) {
  const t = supplierAmount(total), p = supplierAmount(paid);
  requireValue(p <= t, 'Payment cannot exceed the outstanding amount.');
  return { paid: p, outstanding: Math.round((t - p) * 100) / 100, status: p === 0 ? 'unpaid' : p === t ? 'paid' : 'partial' };
}
export function supplierOpeningAllowed(openingDate, invoiceDate) { return !openingDate || invoiceDate > openingDate; }
export function supplierInvoiceTotal(invoice) {
  const total = supplierAmount(invoice.total_amount, true);
  requireValue(Array.isArray(invoice.items) && invoice.items.length > 0, 'The invoice needs item evidence.');
  // Lines plus capitalized freight (B08) make up the amount owed to the supplier.
  const lineUnits = invoice.items.reduce((sum, line) => sum + moneyUnits(line.total_cost, 2), 0) + checkFreight(invoice);
  requireValue(lineUnits === moneyUnits(total, 2), 'Invoice total does not reconcile with its lines and freight. Review the source before registering a supplier balance.');
  return total;
}