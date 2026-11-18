import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import PackageCard from "./PackageCard";
import PackageReadinessBanner from "./PackageReadinessBanner";
import PackageCategoryManager from "./packages/PackageCategoryManager";
import PackageWorkspaceEditor from "./packages/PackageWorkspaceEditor";

export default function PackagesTab({ targetPackageId }) {
  const queryClient = useQueryClient();
  const { permissions } = usePermissions();
  const canEdit =
    permissions?.catering_edit !== false || permissions?.catering_settings_edit === true;

  const [mode, setMode] = useState("list"); // "list" | "create" | "edit"
  const [editing, setEditing] = useState(null);
  const [refGuests, setRefGuests] = useState(100);
  const [category, setCategory] = useState("__all__");
  const [search, setSearch] = useState("");

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["catering-packages"],
    queryFn: () => base44.entities.CateringPackage.list("-created_date", 200),
  });

  useEffect(() => {
    if (!targetPackageId) return;
    const target = packages.find((pkg) => pkg.id === targetPackageId);
    if (target && editing?.id !== target.id) {
      setEditing(target);
      setMode("edit");
    }
  }, [packages, targetPackageId, editing]);

  const toggleRetire = async (pkg) => {
    await base44.entities.CateringPackage.update(pkg.id, { is_active: pkg.is_active === false });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-packages"] }),
      queryClient.invalidateQueries({ queryKey: ["cateringPackages", "public"] }),
    ]);
    toast.success(pkg.is_active === false ? "Package reactivated" : "Package retired");
  };

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.filter((p) => {
      const cat = p.package_category || "Uncategorized";
      if (category !== "__all__" && cat !== category) return false;
      if (!q) return true;
      return (
        String(p.name || "").toLowerCase().includes(q) ||
        String(p.description || "").toLowerCase().includes(q) ||
        String(p.package_category || "").toLowerCase().includes(q) ||
        (p.line_items || []).some((li) => String(li.name || "").toLowerCase().includes(q))
      );
    });
  }, [packages, category, search]);

  const groups = useMemo(() => {
    const grouped = filteredPackages.reduce((acc, p) => {
      const key = p.package_category || "Uncategorized";
      (acc[key] = acc[key] || []).push(p);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPackages]);

  if (mode === "create" || mode === "edit") {
    return (
      <PackageWorkspaceEditor
        pkg={mode === "edit" ? editing : null}
        defaultCategory={category}
        onCancel={() => {
          setMode("list");
          setEditing(null);
        }}
        onSaved={() => {
          setMode("list");
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm">
            <label className="text-xs text-slate-500 block mb-1">Search packages</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by package name, category, or item…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-44">
            <label className="text-xs text-slate-500 block mb-1">Compare at guest count</label>
            <Input
              type="number"
              min="1"
              value={refGuests}
              onChange={(e) => setRefGuests(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="gap-1.5"
          onClick={() => {
            setEditing(null);
            setMode("create");
          }}
        >
          <Plus className="w-4 h-4" /> New Package
        </Button>
      </div>

      <PackageCategoryManager
        packages={packages}
        selectedCategory={category}
        onSelectCategory={setCategory}
        canEdit={canEdit}
      />

      {!isLoading && (
        <PackageReadinessBanner
          packages={packages}
          onFix={(pkg) => {
            setEditing(pkg);
            setMode("edit");
          }}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading packages…</p>
      ) : filteredPackages.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-600">
            {packages.length === 0
              ? "No packages yet — create one to reuse it across quotes and display on the landing page."
              : "No packages match your current search or category filter."}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([catName, list]) => (
            <div key={catName} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-800">{catName}</h3>
                <Badge variant="secondary" className="text-xs">
                  {list.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((p) => (
                  <PackageCard
                    key={p.id}
                    pkg={p}
                    refGuests={refGuests}
                    onEdit={(pkg) => {
                      setEditing(pkg);
                      setMode("edit");
                    }}
                    onToggleRetire={toggleRetire}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}