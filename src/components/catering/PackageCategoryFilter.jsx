import React from "react";
import { Button } from "@/components/ui/button";

/** Category pills for the Packages tab — "All" plus one per category with its count. */
export default function PackageCategoryFilter({ categories, counts, value, onChange }) {
  if (categories.length <= 1) return null;
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        size="sm"
        variant={value === "__all__" ? "default" : "outline"}
        className="h-7 text-xs"
        onClick={() => onChange("__all__")}
      >
        All <span className="ml-1 opacity-70">{total}</span>
      </Button>
      {categories.map((c) => (
        <Button
          key={c}
          size="sm"
          variant={value === c ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={() => onChange(c)}
        >
          {c} <span className="ml-1 opacity-70">{counts[c]}</span>
        </Button>
      ))}
    </div>
  );
}