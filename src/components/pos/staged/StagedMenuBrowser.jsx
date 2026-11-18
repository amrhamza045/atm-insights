import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import POSMenuItemCard from "@/components/pos/POSMenuItemCard";

export default function StagedMenuBrowser({ menuItems = [], menuSections = [], categories = [], onAdd }) {
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const sectionCategories = useMemo(() => {
    let cats = categories.filter((c) => c.is_active && c.visible_pos !== false);
    if (selectedSection !== "all") cats = cats.filter((c) => c.section_id === selectedSection);
    return cats.filter((c) => menuItems.some((i) => i.category === c.name && i.available));
  }, [categories, selectedSection, menuItems]);

  const visibleItems = useMemo(() => {
    const catNames = sectionCategories.map((c) => c.name);
    return menuItems.filter((item) => {
      if (!item.available) return false;
      if (search && !item.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all") return item.category === categoryFilter;
      if (selectedSection !== "all") return catNames.includes(item.category);
      return true;
    });
  }, [menuItems, search, categoryFilter, selectedSection, sectionCategories]);

  return (
    <div className="grid lg:grid-cols-12 gap-4">
      {/* Categories */}
      <div className="lg:col-span-3">
        <Card className="lg:sticky lg:top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[60vh] overflow-y-auto">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                categoryFilter === "all" ? "bg-amber-500 text-white font-medium" : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              All Items
            </button>
            {sectionCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  categoryFilter === cat.name ? "bg-amber-500 text-white font-medium" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Menu */}
      <div className="lg:col-span-9 space-y-3">
        {menuSections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {menuSections.map((section) => (
              <Button
                key={section.id}
                size="sm"
                variant={selectedSection === section.id ? "default" : "outline"}
                onClick={() => { setSelectedSection(section.id); setCategoryFilter("all"); }}
                className={`flex-shrink-0 ${selectedSection === section.id ? "bg-amber-500 hover:bg-amber-600" : ""}`}
              >
                {section.name}
              </Button>
            ))}
            <Button
              size="sm"
              variant={selectedSection === "all" ? "default" : "outline"}
              onClick={() => { setSelectedSection("all"); setCategoryFilter("all"); }}
              className={`flex-shrink-0 ${selectedSection === "all" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
            >
              All Menu
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu..." className="pl-10 h-11" />
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleItems.map((item) => (
            <POSMenuItemCard key={item.id} item={item} isFrozen={false} onAdd={onAdd} getItemPrice={(i) => i.price} />
          ))}
        </div>
        {visibleItems.length === 0 && <p className="text-sm text-slate-500 text-center py-10">No items match this filter</p>}
      </div>
    </div>
  );
}