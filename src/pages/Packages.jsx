import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PackageCatalogCard from "@/components/packages/PackageCatalogCard";
import PackageRequestPanel from "@/components/packages/PackageRequestPanel";

export default function Packages() {
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState([]);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["cateringPackages", "public"],
    queryFn: () => base44.entities.CateringPackage.filter({ is_active: true }),
  });

  const categories = useMemo(
    () => Array.from(new Set(packages.map((p) => p.package_category).filter(Boolean))),
    [packages]
  );

  const visible = category === "all" ? packages : packages.filter((p) => p.package_category === category);

  const toggle = (pkg) =>
    setSelected((prev) =>
      prev.some((p) => p.id === pkg.id) ? prev.filter((p) => p.id !== pkg.id) : [...prev, pkg]
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Packages</h1>
        <p className="text-slate-500 mt-1">Choose the catering packages you're interested in and send us a request.</p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant={category === "all" ? "default" : "outline"} size="sm" onClick={() => setCategory("all")}>
            All
          </Button>
          {categories.map((c) => (
            <Button key={c} variant={category === c ? "default" : "outline"} size="sm" onClick={() => setCategory(c)}>
              {c}
            </Button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <p className="text-slate-500">Loading packages...</p>
          ) : visible.length === 0 ? (
            <p className="text-slate-500">No packages available yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {visible.map((pkg) => (
                <PackageCatalogCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selected.some((p) => p.id === pkg.id)}
                  onToggle={toggle}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <PackageRequestPanel
            selected={selected}
            onRemove={toggle}
            onSubmitted={() => setSelected([])}
          />
        </div>
      </div>
    </div>
  );
}