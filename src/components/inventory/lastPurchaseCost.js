import { resolveConversionFactor, getItemCostUnit } from "@/lib/unitConversion";

export function buildLatestPurchaseCostMap(invoices, inventoryItems, unitRules = []) {
  const itemsById = Object.fromEntries(inventoryItems.map((item) => [item.id, item]));
  const latest = {};
  const newestFirst = [...invoices].sort((a, b) =>
    String(b.created_date || "").localeCompare(String(a.created_date || ""))
  );

  newestFirst.forEach((invoice) => {
    (invoice.items || []).forEach((line) => {
      if (!line.inventory_item_id || latest[line.inventory_item_id]) return;
      const item = itemsById[line.inventory_item_id];
      const piecesCount = Number(line.pieces_count);
      const totalCost = Number(line.total_cost);
      const perPiece = piecesCount > 0 && Number.isFinite(totalCost)
        ? totalCost / piecesCount
        : line.price_per_pcs;

      let rawCost = item?.purchase_unit === "weight"
        ? line.purchase_price
        : (line.unit_type === "weight" ? perPiece : line.purchase_price);

      // If the invoice line specifies a unit that differs from the item's cost unit, convert it
      const costUnit = getItemCostUnit(item);
      if (item && line.unit && costUnit && Number(line.purchase_price) > 0) {
        const conv = resolveConversionFactor(costUnit, line.unit, { item, itemId: item.id, rules: unitRules });
        if (conv.ok) {
          rawCost = Number(line.purchase_price) * conv.factor;
        }
      }

      const cost = Number(rawCost);
      if (!Number.isFinite(cost)) return;
      latest[line.inventory_item_id] = {
        cost: Math.round(cost * 10000) / 10000,
        invoiceNumber: invoice.invoice_number,
        supplierName: invoice.supplier_name,
        invoiceDate: invoice.invoice_date,
      };
    });
  });

  return latest;
}