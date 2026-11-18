import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, AlertTriangle } from "lucide-react";
import IngredientPicker from "@/components/admin/recipe/IngredientPicker";
import UnitFuzzySelect from "@/components/inventory/UnitFuzzySelect";
import {
  BUILTIN_UNITS,
  normalizeUnit,
  getItemStockUnit,
  getItemCostUnit,
  convertQuantity,
  computeConvertedUnitCost,
  roundQty,
} from "@/lib/unitConversion";

export default function UnitConversionTester({ inventoryItems, invById, customRules, catalogUnits = [] }) {
  const referenceUnits = catalogUnits.length > 0 ? catalogUnits : BUILTIN_UNITS;
  const [testItemId, setTestItemId] = useState("");
  const [testQty, setTestQty] = useState("900");
  const [testFromUnit, setTestFromUnit] = useState("g");
  const [testToUnit, setTestToUnit] = useState("kg");

  const testItem = testItemId ? invById.get(testItemId) : null;
  const testConversion = useMemo(
    () =>
      convertQuantity(Number(testQty) || 0, testFromUnit, testToUnit, {
        item: testItem,
        itemId: testItemId || null,
        rules: customRules,
      }),
    [testQty, testFromUnit, testToUnit, testItem, testItemId, customRules]
  );

  const testCostResult = useMemo(
    () => (testItem ? computeConvertedUnitCost(testItem, testFromUnit, customRules) : null),
    [testItem, testFromUnit, customRules]
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            Interactive Conversion & Costing Verifier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Inventory Item (optional — tests item-specific rules & cost)</Label>
            <IngredientPicker
              value={testItemId}
              items={inventoryItems}
              subLabel={() => false}
              onSelect={(id) => {
                setTestItemId(id);
                const picked = invById.get(id);
                if (picked) {
                  setTestToUnit(normalizeUnit(getItemStockUnit(picked)) || "kg");
                }
              }}
            />
            {testItemId && (
              <button
                type="button"
                onClick={() => setTestItemId("")}
                className="text-xs text-slate-500 underline mt-1"
              >
                Clear selected item (test global rules only)
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                step="any"
                value={testQty}
                onChange={(e) => setTestQty(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">From Unit (e.g. Recipe)</Label>
              <UnitFuzzySelect
                value={testFromUnit}
                onChange={setTestFromUnit}
                placeholder="Search unit…"
              />
            </div>
            <div>
              <Label className="text-xs">To Unit (e.g. Stock)</Label>
              <UnitFuzzySelect
                value={testToUnit}
                onChange={setTestToUnit}
                placeholder="Search unit…"
              />
            </div>
          </div>

          <div className="rounded-lg border p-3 bg-slate-50 space-y-2">
            {testConversion.ok ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Converted Quantity:</span>
                  <span className="font-mono font-bold text-base text-emerald-700">
                    {testQty || 0} {testConversion.fromUnit} = {testConversion.quantity} {testConversion.toUnit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Effective Factor:</span>
                  <span className="font-mono">× {roundQty(testConversion.factor, 6)} ({testConversion.source})</span>
                </div>
                {testConversion.steps?.length > 0 && (
                  <p className="text-xs text-slate-500">Path: {testConversion.steps.join(" → ")}</p>
                )}
              </>
            ) : (
              <div className="text-xs text-red-600 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{testConversion.message}</span>
              </div>
            )}

            {testItem && (
              <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Item Stock On Hand:</span>
                  <span className="font-mono font-medium">{testItem.quantity ?? 0} {getItemStockUnit(testItem)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Item Recorded Cost:</span>
                  <span className="font-mono font-medium">
                    {testItem.cost_per_unit ?? "—"} EGP / {getItemCostUnit(testItem)}
                  </span>
                </div>
                {testCostResult?.ok ? (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Cost for {testQty || 0} {normalizeUnit(testFromUnit)}:</span>
                    <span className="font-mono">
                      {roundQty((Number(testQty) || 0) * testCostResult.unitCost, 2)} EGP ({roundQty(testCostResult.unitCost, 4)} EGP/{normalizeUnit(testFromUnit)})
                    </span>
                  </div>
                ) : (
                  <div className="text-amber-700">{testCostResult?.reason}</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Normalized Unit & Alias Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-72 overflow-y-auto divide-y text-xs">
            {referenceUnits.map((u) => (
              <div key={u.code} className="py-2 flex items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-semibold text-slate-900">{u.canonical_label || u.code}</span>
                  <span className="text-slate-500 ml-1.5">— {u.display_name || u.label || u.canonical_label}</span>
                  {u.is_active === false && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] text-slate-400">Inactive</Badge>
                  )}
                  <div className="text-[11px] text-slate-400">
                    Aliases: {(u.aliases || []).join(", ")}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{u.dimension}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}