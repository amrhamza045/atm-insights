import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import ExemptBulkToggles from "./ExemptBulkToggles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import MenuItemPicker from "./MenuItemPicker";
import { resolveMenuItemUnitCost } from "@/lib/menuItemRecipeCost";

const blank = {
  item_type: "menu_item", cost_category: "food", menu_item_id: "", name: "", scaling: "per_guest",
  quantity: 1, unit_price: 0, unit_cost: 0, tax_exempt: false, service_exempt: false,
};

export default function PackageLineEditor({ lines = [], onChange }) {
  const { data: menuItems = [] } = useQuery({
    queryKey: ["catering-menu-items"],
    queryFn: () => base44.entities.MenuItem.list("-created_date", 500),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItemsAll"],
    queryFn: () => base44.entities.InventoryItem.list("name", 1000),
  });

  const { data: unitRules = [] } = useQuery({
    queryKey: ["unitConversionRules"],
    queryFn: async () => {
      try {
        return await base44.entities.UnitConversionRule.list("-created_date", 500);
      } catch {
        return [];
      }
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipesAll"],
    queryFn: () => base44.entities.Recipe.list("-created_date", 500),
  });

  const set = (idx, patch) => onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const pickMenuItem = (idx, id) => {
    const mi = menuItems.find((m) => m.id === id);
    if (!mi) return;
    set(idx, {
      item_type: "menu_item",
      cost_category: "food",
      menu_item_id: mi.id,
      name: mi.name,
      unit_price: Number(mi.price) || 0,
      unit_cost: resolveMenuItemUnitCost(mi, inventoryItems, unitRules, recipes),
    });
  };

  return (
    <div className="space-y-2">
      {lines.length === 0 && (
        <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 p-3">
          No items yet. Click <span className="font-medium">Add package item</span> below for each dish or service in the
          package — pick a menu item (its price and recipe cost fill in automatically) or enter a bespoke item, then set
          whether the quantity is per guest or fixed. The economics box updates as you go.
        </p>
      )}
      {lines.length > 0 && <ExemptBulkToggles lines={lines} onChange={onChange} />}
      {lines.map((l, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Select value={l.item_type || "menu_item"} onValueChange={(v) => set(idx, { item_type: v, menu_item_id: "", unit_cost: 0 })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="menu_item">Menu item</SelectItem>
                <SelectItem value="custom">Bespoke</SelectItem>
              </SelectContent>
            </Select>
            {l.item_type === "menu_item" ? (
              <MenuItemPicker items={menuItems} value={l.menu_item_id || ""} onChange={(v) => pickMenuItem(idx, v)} />
            ) : (
              <Input className="flex-1" placeholder="Item name" value={l.name || ""} onChange={(e) => set(idx, { name: e.target.value })} />
            )}
            <Button variant="ghost" size="icon" onClick={() => onChange(lines.filter((_, i) => i !== idx))}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
            <div>
              <Label className="text-xs">Cost category</Label>
              <Select value={l.cost_category || "food"} onValueChange={(v) => set(idx, { cost_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="food">Food</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Scaling</Label>
              <Select value={l.scaling || "per_guest"} onValueChange={(v) => set(idx, { scaling: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_guest">Per guest</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">{l.scaling === "fixed" ? "Qty" : "Qty / guest"}</Label><Input type="number" min="0" step="any" value={l.quantity} onChange={(e) => set(idx, { quantity: e.target.value })} /></div>
            <div><Label className="text-xs">Unit price</Label><Input type="number" min="0" value={l.unit_price} onChange={(e) => set(idx, { unit_price: e.target.value })} /></div>
            <div><Label className="text-xs">Unit cost</Label><Input type="number" min="0" value={l.unit_cost} onChange={(e) => set(idx, { unit_cost: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onChange([...lines, { ...blank }])}>
        <Plus className="w-4 h-4" /> Add package item
      </Button>
    </div>
  );
}