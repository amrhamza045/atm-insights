import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CaptainCategorySidebar({ categories, categoryFilter, onSelect }) {
  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              categoryFilter === cat ? "bg-amber-500 text-white font-medium" : "hover:bg-slate-100 text-slate-700"
            }`}
          >
            {cat === "all" ? "All Items" : cat}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}