import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { canAccessCatalogItem } from "@/components/support/supportCatalog";
import CatalogCard from "@/components/support/CatalogCard";

// One operational scope of the Support Customization workspace and its settings.
export default function SupportScopeSection({ group, items, access, onEdit }) {
  const isProtectedGroup = group.key === "access_security";

  return (
    <section
      className={`space-y-4 ${
        isProtectedGroup ? "rounded-2xl border border-amber-200 bg-amber-50/30 p-5" : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            {isProtectedGroup && <ShieldAlert className="w-4 h-4 text-amber-700" />}
            <h3 className="text-lg font-semibold text-slate-900">{group.label}</h3>
            <Badge variant="outline" className="text-xs">{items.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{group.subtitle}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <CatalogCard key={item.id} item={item} allowed={canAccessCatalogItem(item, access)} onEdit={onEdit} />
        ))}
      </div>
    </section>
  );
}