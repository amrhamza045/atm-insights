import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShoppingCart, Factory, Beef, Zap } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const SOURCING_META = {
  supplier: { label: "Supplier Direct", icon: ShoppingCart, color: "text-blue-600 bg-blue-50 border-blue-200" },
  manufactured: { label: "Manufactured In-House", icon: Factory, color: "text-amber-600 bg-amber-50 border-amber-200" },
  butchery: { label: "Butchery → Manufactured", icon: Beef, color: "text-red-600 bg-red-50 border-red-200" },
};

export default function SourcingComparison() {
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["inventoryItemsForSourcing"],
    queryFn: () => base44.entities.InventoryItem.list("name"),
  });
  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ["recipesForSourcing"],
    queryFn: () => base44.entities.Recipe.list("-created_date"),
  });
  const { data: butcheryMaterials = [] } = useQuery({
    queryKey: ["butcheryMaterialsForSourcing"],
    queryFn: () => base44.entities.ButcheryRawMaterial.list("-created_date"),
  });

  const butcheryItemIds = useMemo(() => {
    return new Set(butcheryMaterials.map((b) => b.inventory_item_id).filter(Boolean));
  }, [butcheryMaterials]);

  // Build sourcing map per inventory item
  const productSourcing = useMemo(() => {
    const map = {};

    items.forEach((item) => {
      map[item.id] = {
        item,
        supplier: item.supplier && item.cost_per_unit > 0
          ? { cost: item.cost_per_unit, unit: item.purchase_unit_label || item.purchase_unit || "unit", detail: item.supplier }
          : null,
        manufactured: null,
        butcheryManufactured: null,
      };
    });

    recipes.forEach((recipe) => {
      const itemId = recipe.output_item_id;
      if (!itemId) return;
      if (!map[itemId]) {
        const item = items.find((i) => i.id === itemId);
        if (!item) return;
        map[itemId] = { item, supplier: null, manufactured: null, butcheryManufactured: null };
      }

      const costPerUnit = recipe.output_quantity > 0 ? (recipe.total_cost || 0) / recipe.output_quantity : 0;
      const hasButchery = (recipe.ingredients || []).some((ing) => butcheryItemIds.has(ing.inventory_item_id));
      const recipeData = { cost: costPerUnit, unit: recipe.output_unit || "unit", recipeName: recipe.name, hasButchery };

      if (hasButchery) {
        if (!map[itemId].butcheryManufactured || recipeData.cost < map[itemId].butcheryManufactured.cost) {
          map[itemId].butcheryManufactured = recipeData;
        }
      } else {
        if (!map[itemId].manufactured || recipeData.cost < map[itemId].manufactured.cost) {
          map[itemId].manufactured = recipeData;
        }
      }
    });

    return Object.values(map).filter((p) => p.item);
  }, [items, recipes, butcheryItemIds]);

  // Auto-match: products with 2+ sourcing options
  const autoMatches = useMemo(() => {
    return productSourcing
      .map((p) => {
        const options = [];
        if (p.supplier) options.push({ type: "supplier", cost: p.supplier.cost, unit: p.supplier.unit, detail: p.supplier.detail });
        if (p.manufactured) options.push({ type: "manufactured", cost: p.manufactured.cost, unit: p.manufactured.unit, detail: p.manufactured.recipeName });
        if (p.butcheryManufactured) options.push({ type: "butchery", cost: p.butcheryManufactured.cost, unit: p.butcheryManufactured.unit, detail: p.butcheryManufactured.recipeName });
        const costs = options.map((o) => o.cost);
        const cheapest = costs.length > 0 ? Math.min(...costs) : 0;
        const expensive = costs.length > 0 ? Math.max(...costs) : 0;
        const cheapestType = options.find((o) => o.cost === cheapest)?.type;
        return { ...p, options, cheapest, expensive, savings: expensive - cheapest, optionCount: options.length, cheapestType };
      })
      .filter((p) => p.optionCount >= 2)
      .sort((a, b) => b.savings - a.savings);
  }, [productSourcing]);

  if (itemsLoading || recipesLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-3 bg-slate-50 border-slate-200">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-600">
            The system automatically matched products that have multiple sourcing paths (supplier direct, manufactured in-house, or butchery → manufactured).
            Products are ranked by potential savings — the difference between the cheapest and most expensive option.
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Available Options</TableHead>
              <TableHead className="text-right">Cheapest Cost</TableHead>
              <TableHead className="text-right">Potential Savings</TableHead>
              <TableHead>Recommended</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {autoMatches.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">No products with multiple sourcing options found yet. Add recipes and supplier costs to the same inventory items to see auto-matches.</TableCell></TableRow>
            ) : autoMatches.map((p) => (
              <TableRow key={p.item.id}>
                <TableCell className="font-medium">{p.item.name}</TableCell>
                <TableCell className="text-sm text-slate-500">{p.item.category_name || "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.options.map((opt, i) => {
                      const Meta = SOURCING_META[opt.type];
                      const OptIcon = Meta.icon;
                      return (
                        <Badge key={i} variant="outline" className={`text-xs ${Meta.color}`}>
                          <OptIcon className="w-3 h-3 mr-1" /> {Meta.label}: {formatCurrency(opt.cost)}/{opt.unit}
                        </Badge>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">{formatCurrency(p.cheapest)}</TableCell>
                <TableCell className="text-right font-bold text-amber-600">{formatCurrency(p.savings)}</TableCell>
                <TableCell>
                  {p.cheapestType && (() => {
                    const Meta = SOURCING_META[p.cheapestType];
                    const Icon = Meta.icon;
                    return (
                      <Badge className={`gap-1 ${Meta.color} border`}>
                        <Icon className="w-3 h-3" /> {Meta.label}
                      </Badge>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}