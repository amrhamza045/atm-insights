import { describe, it, expect } from "vitest";
import {
  normalizeUnit,
  resolveConversionFactor,
  convertQuantity,
  toStockQuantity,
  convertCartShortfallToBuyQuantity,
  computeConvertedUnitCost,
  computeIngredientCost,
  validateConversionRule,
  roundQty,
} from "@/lib/unitConversion";
import { buildLatestPurchaseCostMap } from "@/components/inventory/lastPurchaseCost";

describe("Unit Conversion Engine & Business Flows", () => {
  it("normalizes English and Arabic unit aliases to canonical codes", () => {
    expect(normalizeUnit("Kilograms")).toBe("kg");
    expect(normalizeUnit("جرام")).toBe("g");
    expect(normalizeUnit("كيلو")).toBe("kg");
    expect(normalizeUnit("pieces")).toBe("pcs");
    expect(normalizeUnit("Millilitres")).toBe("ml");
  });

  it("converts built-in metric mass and volume quantities", () => {
    const gToKg = convertQuantity(900, "g", "kg");
    expect(gToKg.ok).toBe(true);
    expect(gToKg.quantity).toBe(0.9);

    const kgToG = convertQuantity(2.5, "kg", "g");
    expect(kgToG.ok).toBe(true);
    expect(kgToG.quantity).toBe(2500);

    const mlToL = convertQuantity(250, "ml", "l");
    expect(mlToL.ok).toBe(true);
    expect(mlToL.quantity).toBe(0.25);
  });

  it("enforces rule precedence (item-specific > custom global > built-in) and multi-hop resolution", () => {
    const customRules = [
      { id: "r1", scope: "global", from_unit: "cup", to_unit: "ml", factor: 250, bidirectional: true, is_active: true },
      { id: "r2", scope: "item", inventory_item_id: "item-beef", inventory_item_name: "Beef Patty", from_unit: "pcs", to_unit: "g", factor: 150, bidirectional: true, is_active: true },
      { id: "r3", scope: "item", inventory_item_id: "item-beef", inventory_item_name: "Beef Patty", from_unit: "box", to_unit: "pcs", factor: 20, bidirectional: true, is_active: true },
    ];

    const cupRes = convertQuantity(2, "cup", "ml", { rules: customRules });
    expect(cupRes.ok).toBe(true);
    expect(cupRes.quantity).toBe(500);
    expect(cupRes.source).toBe("global_rule");

    const pattyRes = convertQuantity(6, "pcs", "kg", { itemId: "item-beef", rules: customRules });
    expect(pattyRes.ok).toBe(true);
    expect(pattyRes.quantity).toBe(0.9);
    expect(pattyRes.source).toBe("item_rule");

    const boxToKg = convertQuantity(2, "box", "kg", { itemId: "item-beef", rules: customRules });
    expect(boxToKg.ok).toBe(true);
    expect(boxToKg.quantity).toBe(6);
  });

  it("rejects cross-dimension global rules, non-positive factors, and conflicting duplicates", () => {
    const crossGlobal = validateConversionRule({ scope: "global", from_unit: "pcs", to_unit: "kg", factor: 0.2 }, []);
    expect(crossGlobal.valid).toBe(false);

    const crossItem = validateConversionRule({ scope: "item", inventory_item_id: "item-1", from_unit: "pcs", to_unit: "kg", factor: 0.2 }, []);
    expect(crossItem.valid).toBe(true);

    const zeroFactor = validateConversionRule({ scope: "global", from_unit: "kg", to_unit: "g", factor: 0 }, []);
    expect(zeroFactor.valid).toBe(false);

    const conflictRules = [
      { id: "c1", scope: "item", inventory_item_id: "item-x", from_unit: "box", to_unit: "kg", factor: 10, is_active: true },
      { id: "c2", scope: "item", inventory_item_id: "item-x", from_unit: "box", to_unit: "kg", factor: 15, is_active: true },
    ];
    const ambig = resolveConversionFactor("box", "kg", { itemId: "item-x", rules: conflictRules });
    expect(ambig.ok).toBe(false);
    expect(ambig.error).toBe("ambiguous_conversion");
  });

  it("converts stock deduction, ingredient cost, and purchase invoice cost accurately", () => {
    const chickenItem = {
      id: "inv-chicken",
      name: "Chicken Breast",
      quantity: 20,
      unit: "kg",
      purchase_unit: "weight",
      purchase_unit_label: "kg",
      selling_unit: "weight",
      selling_unit_label: "kg",
      cost_per_unit: 200,
    };

    const stockDeduction = toStockQuantity(900, "g", chickenItem, []);
    expect(stockDeduction.ok).toBe(true);
    expect(stockDeduction.quantity).toBe(0.9);
    expect(stockDeduction.stockUnit).toBe("kg");

    const ingCost = computeIngredientCost(900, "g", chickenItem, []);
    expect(ingCost.ok).toBe(true);
    expect(ingCost.unitCost).toBe(0.2);
    expect(ingCost.totalCost).toBe(180);

    const boxCost = computeConvertedUnitCost(chickenItem, "box", []);
    expect(boxCost.ok).toBe(false);

    const reqBoxRules = [{ id: "b1", scope: "item", inventory_item_id: "inv-chicken", from_unit: "box", to_unit: "kg", factor: 10, bidirectional: true, is_active: true }];
    const boxCostResolved = computeConvertedUnitCost(chickenItem, "box", reqBoxRules);
    expect(boxCostResolved.ok).toBe(true);
    expect(boxCostResolved.unitCost).toBe(2000);

    const invoices = [
      {
        id: "inv-1",
        invoice_number: "INV-001",
        supplier_name: "Fresh Poultry",
        invoice_date: "2026-11-01",
        created_date: "2026-11-01T10:00:00Z",
        items: [
          {
            inventory_item_id: "inv-chicken",
            quantity: 2,
            unit: "box",
            unit_type: "weight",
            purchase_price: 2000,
            total_cost: 4000,
          },
        ],
      },
    ];
    const latestMap = buildLatestPurchaseCostMap(invoices, [chickenItem], reqBoxRules);
    expect(latestMap["inv-chicken"].cost).toBe(200);
  });

  it("converts recommended-cart shortfalls from required recipe units (g/ml) into supplier purchase units (kg/L)", () => {
    const sugarItem = {
      id: "inv-sugar",
      name: "سكر",
      unit: "kg",
      purchase_unit: "weight",
      purchase_unit_label: "kg",
      selling_unit: "weight",
      selling_unit_label: "kg",
      cost_per_unit: 38,
    };
    const sugarConv = convertCartShortfallToBuyQuantity(650, "g", sugarItem, []);
    expect(sugarConv.ok).toBe(true);
    expect(sugarConv.converted).toBe(true);
    expect(sugarConv.quantity).toBe(0.65);
    expect(roundQty(sugarConv.quantity * 38, 2)).toBe(24.7);

    const milkItem = {
      id: "inv-milk",
      name: "لبن",
      unit: "L",
      purchase_unit: "weight",
      purchase_unit_label: "L",
      selling_unit: "weight",
      selling_unit_label: "L",
      cost_per_unit: 48,
    };
    const milkConv = convertCartShortfallToBuyQuantity(2000, "ml", milkItem, []);
    expect(milkConv.ok).toBe(true);
    expect(milkConv.converted).toBe(true);
    expect(milkConv.quantity).toBe(2);
    expect(roundQty(milkConv.quantity * 48, 2)).toBe(96);

    const vanillaItem = {
      id: "inv-vanilla",
      name: "فانيليا",
      unit: "pcs",
      purchase_unit: "pcs",
      purchase_unit_label: "pcs",
      selling_unit: "pcs",
      selling_unit_label: "pcs",
      cost_per_unit: 2.5,
    };
    const vanillaConv = convertCartShortfallToBuyQuantity(5, "pcs", vanillaItem, []);
    expect(vanillaConv.ok).toBe(true);
    expect(vanillaConv.converted).toBe(false);
    expect(vanillaConv.quantity).toBe(5);
    expect(roundQty(vanillaConv.quantity * 2.5, 2)).toBe(12.5);
  });
});