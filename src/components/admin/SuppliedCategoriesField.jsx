import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";

export default function SuppliedCategoriesField({ value = [], onChange }) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("name"),
  });

  const toggle = (cat) => {
    const next = value.includes(cat.id) ? value.filter((id) => id !== cat.id) : [...value, cat.id];
    onChange(next, categories.filter((c) => next.includes(c.id)).map((c) => c.name));
  };

  return (
    <div>
      <Label>Supplied categories</Label>
      <div className="flex flex-wrap gap-2 mt-2">
        {isLoading && <span className="text-xs text-slate-400">Loading categories…</span>}
        {!isLoading && categories.length === 0 && (
          <span className="text-xs text-slate-400">No inventory categories yet</span>
        )}
        {categories.filter((c) => c.is_active !== false).map((cat) => {
          const on = value.includes(cat.id);
          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => toggle(cat)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                on ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-300 hover:border-slate-500"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}