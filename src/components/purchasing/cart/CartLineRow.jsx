import React, { useState } from "react";
import { suppliersForCategory } from "@/components/purchasing/supplierCategories";
import SupplierFilterNote from "@/components/purchasing/SupplierFilterNote";
import SupplierCombobox from "@/components/purchasing/SupplierCombobox";
import { Badge } from "@/components/ui/badge";
import { NumberInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { cartLineTotal } from "./recommendedCart";
import PurchaseUnitSelect from '@/components/purchasing/PurchaseUnitSelect';
import usePurchaseUnits from '@/components/purchasing/usePurchaseUnits';
import { changePurchaseUnit, purchaseUnitPrice } from '@/components/purchasing/purchaseUnits';
import { normalizeUnit } from '@/lib/unitConversion';

const PURPOSE_LABEL = {
  stock_pull: "From stock",
  production_input: "Production input",
  manual: "Added manually",
};

export default function CartLineRow({ line, suppliers, reference, onChange, onRemove }) {
  const [showAll, setShowAll] = useState(false);
  const { catalog, rules, loading, error } = usePurchaseUnits();
  const item = reference?.inventoryItems?.find(i => i.id === line.inventory_item_id);
  const activeSuppliers = (suppliers || []).filter((s) => s.is_active !== false);
  const choice = suppliersForCategory(activeSuppliers, line.category_id, showAll);
  const allowed = new Set(choice.list.map((s) => s.id));
  const historyById = new Map((line.supplier_options || []).map((o) => [o.supplier_id, o]));
  const allOptions = activeSuppliers.map((s) => {
    const hist = historyById.get(s.id);
    return {
      supplier_id: s.id,
      name: s.name,
      contact: hist?.contact || s.phone || s.email || "",
      last_price: hist?.last_price || 0,
    };
  });
  const narrowed = allOptions.filter((o) => allowed.has(o.supplier_id) || o.supplier_id === line.supplier_id);
  const options = narrowed.length ? narrowed : allOptions;

  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{line.inventory_item_name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(line.purposes || []).map((p) => (
              <Badge key={p} variant="outline" className="text-xs">{PURPOSE_LABEL[p] || p}</Badge>
            ))}
            {line.produced_for?.length > 0 && (
              <Badge variant="outline" className="text-xs">for {line.produced_for.join(", ")}</Badge>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove} title="Remove line">
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div>
          <p className="text-xs text-slate-500 mb-1">Required</p>
          <div className="h-8 px-2 flex items-center rounded border border-slate-200 bg-slate-50 text-sm text-slate-700">
            {line.demand} {line.unit}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Free stock</p>
          <div className="h-8 px-2 flex items-center rounded border border-slate-200 bg-slate-50 text-sm text-slate-700">
            {line.free_stock} {line.unit}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Shortfall</p>
          <div className="h-8 px-2 flex items-center rounded border border-red-200 bg-red-50 text-sm font-medium text-red-700">
            {line.shortfall} {line.unit}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Buy qty ({line.purchase_unit_label})</p>
          <PurchaseUnitSelect item={item} value={normalizeUnit(line.purchase_unit_label)} catalog={catalog}
            rules={rules} disabled={loading || !!error} onChange={unit => onChange(changePurchaseUnit(line, unit, item, rules))} />
          <NumberInput
            type="number"
            min="0"
            step="any"
            value={line.quantity}
            onChange={(e) => onChange({ quantity: parseFloat(e.target.value) || 0 })}
            className="w-full h-8 px-2 border border-slate-300 rounded text-sm"
          />
          {line.conversion_applied && (
            <p className="text-[11px] text-emerald-700 mt-0.5">
              {line.shortfall} {line.unit} → {line.quantity} {line.purchase_unit_label}
            </p>
          )}
          {line.conversion_warning && (
            <p className="text-[11px] text-amber-700 mt-0.5">
              {line.conversion_warning}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Unit price</p>
          <NumberInput
            type="number"
            min="0"
            step="0.01"
            value={line.unit_price}
            onChange={(e) => onChange({ unit_price: parseFloat(e.target.value) || 0 })}
            className="w-full h-8 px-2 border border-slate-300 rounded text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Supplier</span>
          <SupplierCombobox
            className="h-8 px-2 rounded max-w-[220px]"
            value={line.supplier_id || ""}
            options={options.map((o) => ({
              value: o.supplier_id,
              label: `${o.name}${o.last_price ? ` — ${formatCurrency(o.last_price, false)}` : ""}`,
              sub: o.contact || "",
            }))}
            onChange={(id) => {
              const pick = options.find((o) => o.supplier_id === id);
              onChange({
                supplier_id: id,
                supplier_name: pick?.name || "",
                supplier_contact: pick?.contact || "",
                unit_price: pick?.last_price && item
                  ? purchaseUnitPrice(item, line.purchase_unit_label, [{ items: [{ inventory_item_id: item.id,
                      unit: item.purchase_unit_label || item.unit, purchase_price: pick.last_price }] }], rules)
                  : line.unit_price,
              });
            }}
          />
          <SupplierFilterNote {...choice} showAll={showAll} onShowAllChange={setShowAll} />
        </div>
        <p className="text-sm font-semibold text-amber-700">{formatCurrency(cartLineTotal(line))}</p>
      </div>

      {line.events?.length > 0 && (
        <p className="text-xs text-slate-500">
          Covers: {line.events.map((e) => `${e.name}${e.qty ? ` (${e.qty} ${line.unit})` : ""}`).join(" · ")}
        </p>
      )}
    </div>
  );
}