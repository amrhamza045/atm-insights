import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Pencil, Trash2, Tag, ChefHat, Coffee, Search, PoundSterling } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { resolveMenuItemUnitCost } from "@/lib/menuItemRecipeCost";

export default function MenuItemsTab({
  menuItems,
  categories,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onOpenRecipe,
  onOpenItemOptions,
  onSetStationForCategory,
  onBulkPriceAdjust
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItemsAll"],
    queryFn: () => base44.entities.InventoryItem.list("name", 1000)
  });

  const { data: unitRules = [] } = useQuery({
    queryKey: ["unitConversionRules"],
    queryFn: async () => {
      try {
        return await base44.entities.UnitConversionRule.list("-created_date", 500);
      } catch {
        return [];
      }
    }
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipesAll"],
    queryFn: () => base44.entities.Recipe.list("-created_date", 500)
  });

  const filteredItemsByCategory = (categoryName) => {
    return menuItems
      .filter(item => item.category === categoryName)
      .filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return item.name?.toLowerCase().includes(query) ||
               item.description?.toLowerCase().includes(query);
      });
  };

  const activeCategories = categories.filter(cat => {
    if (!cat.is_active) return false;
    if (!searchQuery) return true;
    // When searching, only show categories that have matching items
    return filteredItemsByCategory(cat.name).length > 0;
  });
  const defaultOpenCategories = activeCategories.map(cat => cat.id);

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button 
          variant="outline"
          onClick={onBulkPriceAdjust}
          className="gap-2"
        >
          <PoundSterling className="w-4 h-4" />
          Bulk Price Adjust
        </Button>
        <Button onClick={() => onAddItem()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card className="p-12 text-center">
          <Tag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">No categories yet</h3>
          <p className="text-sm text-slate-500 mt-1">Create categories first to organize your menu items</p>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={defaultOpenCategories} className="space-y-4">
          {activeCategories.map(cat => {
            const categoryItems = filteredItemsByCategory(cat.name);
            return (
              <AccordionItem key={cat.id} value={cat.id} className="border rounded-lg bg-white">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    {cat.image_url && (
                      <img src={cat.image_url} alt={cat.name} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div className="text-left">
                      <h2 className="text-lg font-semibold">{cat.name}</h2>
                      {cat.description && (
                        <p className="text-sm text-slate-500">{cat.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {categoryItems.length} items
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="flex justify-end mb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSetStationForCategory(cat)}
                      className="gap-2"
                    >
                      <Coffee className="w-4 h-4" />
                      Set Station for All
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {categoryItems.map(item => (
                      <Card key={item.id}>
                        {item.image_url && (
                          <div className="h-40 overflow-hidden rounded-t-lg">
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant={item.available ? "default" : "secondary"}>
                              {item.available ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-amber-600">
                                Direct: {formatCurrency(item.price)}
                              </span>
                              {item.indirect_price && (
                                <span className="text-xs font-medium text-slate-500">
                                  Indirect: {formatCurrency(item.indirect_price)}
                                </span>
                              )}
                              {(item.recipe?.length > 0 || Number(item.total_cost) > 0) && (
                                <span className="text-xs font-medium text-emerald-700 mt-0.5">
                                  Recipe Cost: {formatCurrency(resolveMenuItemUnitCost(item, inventoryItems, unitRules, recipes))}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => onEditItem(item)}
                                title="Edit item"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              {(!item.sizes || item.sizes.length === 0) && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => onOpenRecipe(item)}
                                  title="Manage Recipe"
                                >
                                  <ChefHat className="w-3 h-3" />
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => onOpenItemOptions(item)}
                                title="Link options"
                              >
                                <Tag className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => onDeleteItem(item.id)}
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {categoryItems.length === 0 && (
                      <p className="text-sm text-slate-400 col-span-full py-4 text-center">
                        No items in this category{searchQuery && " matching search"}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}