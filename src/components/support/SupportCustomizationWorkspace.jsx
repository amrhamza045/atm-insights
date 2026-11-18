import React, { useState } from "react";
import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";
import { CATALOG, SCOPE_GROUPS, canAccessCatalogItem } from "@/components/support/supportCatalog";
import SupportScopeButtons from "@/components/support/SupportScopeButtons";
import SupportWorkspaceFilters from "@/components/support/SupportWorkspaceFilters";
import SupportScopeSection from "@/components/support/SupportScopeSection";
import QuickEditDialog from "@/components/support/QuickEditDialog";

// Admin › Support Customization (formerly its own screen under Operations).
// The Admin tab itself requires the Open Support Customization permission.
export default function SupportCustomizationWorkspace() {
  const isAdmin = useIsAdmin();
  const { permissions, currentUser } = usePermissions();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const access = { isAdmin, permissions, currentUser };

  const catalog = CATALOG.filter((i) => !i.safetyValveOnly || currentUser?.perm_is_safety_valve === true);
  const term = q.trim().toLowerCase();
  const filtered = catalog.filter((i) => {
    if (cat !== "All" && i.category !== cat) return false;
    if (scopeFilter !== "all" && i.scope !== scopeFilter) return false;
    if (!term) return true;
    return `${i.title} ${i.desc} ${i.category} ${i.scopeLabel} ${i.impact || ""}`.toLowerCase().includes(term);
  });

  const handleQuickEdit = (item) => {
    if (canAccessCatalogItem(item, access)) setEditing(item);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Support Customization</h2>
          <p className="text-sm text-slate-500 max-w-2xl">
            Settings are organized by operational scope with clear impact labels. Use quick edit for compact toggles and prices, or open the full settings screen for multi-section configuration.
          </p>
        </div>
        <SupportScopeButtons value={scopeFilter} onChange={setScopeFilter} total={catalog.length} />
      </div>

      <SupportWorkspaceFilters query={q} onQueryChange={setQ} category={cat} onCategoryChange={setCat} />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center border rounded-xl bg-card">
          No settings match your current search and filters.
        </p>
      ) : (
        <div className="space-y-10">
          {SCOPE_GROUPS.map((group) => {
            const items = filtered.filter((i) => i.scope === group.key);
            return items.length > 0 ? (
              <SupportScopeSection key={group.key} group={group} items={items} access={access} onEdit={handleQuickEdit} />
            ) : null;
          })}
        </div>
      )}

      <QuickEditDialog item={editing} onClose={() => setEditing(null)} />
    </div>
  );
}