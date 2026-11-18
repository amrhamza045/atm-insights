import React, { useMemo, useState } from "react";
import { Input, NumberInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Package } from "lucide-react";
import PurchaseUnitSelect from "@/components/purchasing/PurchaseUnitSelect";
import { getItemCostUnit, getItemStockUnit, normalizeUnit } from "@/lib/unitConversion";
import { purchaseUnitOptions, purchaseUnitType, changePurchaseUnit } from "@/components/purchasing/purchaseUnits";

/**
 * Returns the inventory items a supplier is recorded as supplying:
 * items where supplier_id === supplier.id OR category_id is in supplier.supplied_category_ids
 * (optionally narrowed by selectedCategory).
 */
export function getSuppliedItemsForSupplier({ supplier, allInventoryItems, invoices = [], selectedCategory = "" }) {
  if (!supplier) return [];
  const catIds = new Set(supplier.supplied_category_ids || []);
  const invoicedItemIds = new Set();
  (invoices || []).forEach((inv) => {
    if (inv.supplier_id === supplier.id) {
      (inv.items || []).forEach((line) => {
        if (line.inventory_item_id) invoicedItemIds.add(line.inventory_item_id);
      });
    }
  });

  return (allInventoryItems || []).filter((item) => {
    if (selectedCategory && item.category_id !== selectedCategory) return false;
    return (
      item.supplier_id === supplier.id ||
      (item.category_id && catIds.has(item.category_id)) ||
      invoicedItemIds.has(item.id)
    );
  });
}

export default function SupplierRfqItemSelector({
  supplier,
  allInventoryItems,
  invoices,
  selectedCategory,
  orderItems,
  onOrderItemsChange,
  catalog,
  unitRules,
  unitsLoading,
  unitsError,
}) {
  const [search, setSearch] = useState("");

  const suppliedItems = useMemo(
    () => getSuppliedItemsForSupplier({ supplier, allInventoryItems, invoices, selectedCategory }),
    [supplier, allInventoryItems, invoices, selectedCategory]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliedItems;
    return suppliedItems.filter(
      (item) =>
        (item.name || "").toLowerCase().includes(q) ||
        (item.category_name || "").toLowerCase().includes(q)
    );
  }, [suppliedItems, search]);

  const selectedById = useMemo(
    () => new Map((orderItems || []).map((line) => [line.inventory_item_id, line])),
    [orderItems]
  );

  const toggleItem = (item, checked) => {
    if (!checked) {
      onOrderItemsChange((orderItems || []).filter((i) => i.inventory_item_id !== item.id));
      return;
    }
    if (selectedById.has(item.id)) return;
    const unitLabel = normalizeUnit(getItemCostUnit(item));
    const unitToUse = purchaseUnitType(unitLabel);
    const newLine = {
      inventory_item_id: item.id,
      inventory_item_name: item.name,
      category_id: item.category_id || "",
      category_name: item.category_name || "",
      quantity_ordered: 1,
      purchase_unit: unitToUse,
      purchase_unit_label: unitLabel,
      selling_unit: item.selling_unit || "pcs",
      selling_unit_label: getItemStockUnit(item),
      received_selling_qty: null,
      approval_status: "pending",
      unit: unitLabel,
      unit_price: 0,
      base_unit_price: 0,
      manual_unit_price: "",
      total_price: 0,
      system_stock: item.quantity ?? null,
      manual_balance: "",
      manual_balance_unit: getItemStockUnit(item),
    };
    onOrderItemsChange([...(orderItems || []), newLine]);
  };

  const updateQty = (itemId, qty) => {
    onOrderItemsChange(
      (orderItems || []).map((line) =>
        line.inventory_item_id === itemId
          ? {
              ...line,
              quantity_ordered: qty,
              total_price: qty * (Number(line.unit_price) || 0),
            }
          : line
      )
    );
  };

  const updateUnit = (item, nextUnit) => {
    onOrderItemsChange(
      (orderItems || []).map((line) =>
        line.inventory_item_id === item.id
          ? changePurchaseUnit(line, nextUnit, item, unitRules, "quantity_ordered")
          : line
      )
    );
  };

  if (!supplier) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Select Items for RFQ ({(orderItems || []).length} selected of {suppliedItems.length} supplied)
          </p>
          <p className="text-xs text-slate-500">
            Tick only the items you want to request a quote for and enter the requested quantity. Prices are recorded later when the supplier responds.
          </p>
        </div>
        {orderItems?.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOrderItemsChange([])}
            className="text-xs text-slate-500"
          >
            Clear selection
          </Button>
        )}
      </div>

      {unitsError && (
        <p role="alert" className="text-xs text-red-600">
          Could not load unit conversion rules. Reopen this screen to try again.
        </p>
      )}

      {suppliedItems.length === 0 ? (
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
          <Package className="w-6 h-6 mx-auto mb-1 text-slate-400" />
          No inventory items are recorded under this supplier or its supplied categories.
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplied items..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="border rounded-lg divide-y max-h-80 overflow-y-auto bg-white">
            {filteredItems.map((item) => {
              const selectedLine = selectedById.get(item.id);
              const isSelected = !!selectedLine;
              const unitCode = normalizeUnit(
                selectedLine?.purchase_unit_label || selectedLine?.unit || getItemCostUnit(item)
              );
              const unitValid =
                !unitsLoading &&
                !unitsError &&
                purchaseUnitOptions(item, catalog, unitRules).some((u) => u.code === unitCode);

              return (
                <div
                  key={item.id}
                  className={`p-3 transition-colors ${isSelected ? "bg-amber-50/60" : "hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleItem(item, Boolean(checked))}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-900">{item.name}</span>
                          {item.category_name && (
                            <Badge variant="outline" className="text-[11px] font-normal">
                              {item.category_name}
                            </Badge>
                          )}
                          {item.supplier_id === supplier.id && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                              Preferred
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          On hand: {item.quantity ?? 0} {getItemStockUnit(item)}
                        </p>
                      </div>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-24">
                          <NumberInput
                            type="number"
                            min="0"
                            step="0.01"
                            value={selectedLine.quantity_ordered}
                            onChange={(e) => updateQty(item.id, parseFloat(e.target.value) || 0)}
                            placeholder="Qty"
                            className="h-8 px-2 text-sm bg-white"
                          />
                        </div>
                        <PurchaseUnitSelect
                          item={item}
                          value={unitCode}
                          catalog={catalog}
                          rules={unitRules}
                          disabled={unitsLoading || !!unitsError}
                          onChange={(u) => updateUnit(item, u)}
                        />
                      </div>
                    )}
                  </div>
                  {isSelected && !unitValid && !unitsLoading && (
                    <p className="text-xs text-red-600 mt-1 ml-6">
                      Define a valid purchase-to-stock unit conversion for {item.name} before submitting.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}