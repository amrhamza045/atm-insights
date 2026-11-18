import { base44 } from "@/api/base44Client";
import { round2 } from "@/components/catering/cateringLogic";
import { syncCateringPurchaseOrder } from "@/components/catering/procurement";
import { roundQty } from '@/lib/unitConversion';
import { purchaseUnitType } from '@/components/purchasing/purchaseUnits';
import purchaseInvoiceLine from '@/components/purchasing/cart/purchaseInvoiceLine';

/**
 * Step one of completion: save what was really bought onto the purchase order.
 * This touches the ORDER ONLY — no stock moves here.
 */
export async function savePurchaseOrderLines({ order, received, userEmail }) {
  const items = (order.items || []).map((line) => {
    const edit = received[line.inventory_item_id] || {};
    const qty = Number(edit.quantity ?? line.quantity_ordered) || 0;
    const price = Number(edit.unit_price ?? line.unit_price) || 0;
    return {
      ...line,
      quantity_ordered: roundQty(qty),
      received_selling_qty: roundQty(qty),
      unit_price: roundQty(price),
      total_price: round2(qty * price),
      approval_status: edit.dropped ? "rejected" : line.approval_status,
    };
  });

  const total = items
    .filter((i) => i.approval_status !== "rejected")
    .reduce((s, i) => s + (i.total_price || 0), 0);

  return base44.entities.PurchaseOrder.update(order.id, {
    items,
    total_amount: round2(total),
    receipt_confirmed_at: new Date().toISOString(),
    ...(userEmail ? { receipt_confirmed_by: userEmail } : {}),
  });
}

/** Lines that will actually be received — rejected/dropped ones are excluded. */
export function receivableLines(order) {
  return (order.items || []).filter((i) => i.approval_status !== "rejected");
}

/**
 * Build the PurchaseInvoice payload from the order's real lines.
 *
 * Quantities and prices stay in the selected purchase unit. The existing server
 * conversion engine converts that unit into the item's stock unit on posting.
 */
export function buildInvoicePayload({ order, received, inventoryItems, branch }) {
  const items = receivableLines(order).map((line) => {
    const edit = received[line.inventory_item_id] || {};
    const item = inventoryItems.find((i) => i.id === line.inventory_item_id);
    const qty = roundQty(Number(edit.quantity ?? line.quantity_ordered) || 0);
    const price = roundQty(Number(edit.unit_price ?? line.unit_price) || 0);
    const purchaseUnit = line.purchase_unit_label || line.unit || item?.purchase_unit_label || item?.unit || '';
    const isWeight = purchaseUnitType(purchaseUnit) === 'weight';
    return purchaseInvoiceLine({
      line, item, quantity: qty, price, unit: purchaseUnit, isWeight,
      expiryDate: edit.expiry_date,
    });
  });

  return {
    invoice_number: `INV-REC-${order.order_number}-${Date.now()}`,
    supplier_id: order.supplier_id,
    supplier_name: order.supplier,
    invoice_date: new Date().toISOString().split("T")[0],
    items,
    total_amount: round2(items.reduce((s, i) => s + (i.total_cost || 0), 0)),
    branch_id: branch?.id || order.branch_id || "",
    branch_name: branch?.name || order.branch_name || "",
    notes: `Generated from recommended purchase order ${order.order_number}.`,
  };
}

/**
 * Step two of completion: generate the invoice and let the existing
 * processPurchaseInvoice function move the stock. That function is the single
 * source of truth for inventory movement — we never increment stock from a
 * purchase-order status change, so the invoice ledger and real stock can never
 * drift apart. The order is only flipped to delivered after the invoice lands.
 */
export async function recordRealPurchase({ order, received, inventoryItems, branch, userEmail }) {
  const invoice = buildInvoicePayload({ order, received, inventoryItems, branch });
  if (!invoice.branch_id) throw new Error("A branch is required to record a purchase invoice");
  if (!invoice.items.length) throw new Error("There are no receivable lines on this order");

  const res = await base44.functions.invoke("processPurchaseInvoice", { invoice });
  const data = res?.data || res;
  if (data?.error) throw new Error(data.error);

  await base44.entities.PurchaseOrder.update(order.id, {
    status: "delivered",
    purchase_recorded_invoice_id: data?.invoice_id || "",
    purchase_recorded_by: userEmail || "",
    purchase_recorded_at: new Date().toISOString(),
  });
  await syncCateringPurchaseOrder(order);

  return data;
}