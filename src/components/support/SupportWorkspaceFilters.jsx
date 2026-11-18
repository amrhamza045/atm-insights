import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { CATEGORIES } from "@/components/support/supportCatalog";

// Search box and category chips of the Support Customization workspace.
export default function SupportWorkspaceFilters({ query, onQueryChange, category, onCategoryChange }) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search by setting, scope, or impact (e.g. unit conversions, KDS, packages, payment policies, landing)…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => onCategoryChange(c)}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${
              category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}