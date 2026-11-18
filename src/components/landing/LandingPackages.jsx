import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PackageCarousel from "./PackageCarousel";
import PackageDetailsDialog from "./PackageDetailsDialog";

const chip = (active) =>
  `px-4 h-9 rounded-full text-sm font-semibold transition-colors border ${
    active
      ? "bg-[hsl(var(--landing-navy))] text-[hsl(var(--landing-ivory))] border-[hsl(var(--landing-navy))]"
      : "border-[hsl(var(--landing-navy)/0.2)] hover:border-[hsl(var(--landing-gold))]"
  }`;

export default function LandingPackages({ selected, onToggle, onSetExtras, onRequest }) {
  const [category, setCategory] = useState("all");
  const [openPkg, setOpenPkg] = useState(null);
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["cateringPackages", "public"],
    queryFn: async () => (await base44.functions.invoke("listLandingPackages", {})).data?.packages || [],
  });
  const categories = useMemo(
    () => Array.from(new Set(packages.map((p) => p.package_category).filter(Boolean))),
    [packages]
  );
  const visible = category === "all" ? packages : packages.filter((p) => p.package_category === category);

  return (
    <section id="packages" className="bg-[hsl(var(--landing-cream))] py-20 md:py-28 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.3em] uppercase text-[hsl(var(--landing-gold))]">Our packages</p>
        <h2 className="font-heading mt-4 text-4xl md:text-5xl font-medium tracking-tight">Choose what fits your occasion</h2>
        <p className="mt-4 max-w-xl text-[hsl(var(--landing-navy)/0.7)]">Select one or more packages, then request a quote — we'll tailor it to your event.</p>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8">
            <button className={chip(category === "all")} onClick={() => setCategory("all")}>All</button>
            {categories.map((c) => (
              <button key={c} className={chip(category === c)} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
        )}

        <div className="mt-10">
          {isLoading ? (
            <p className="text-[hsl(var(--landing-navy)/0.6)]">Loading packages...</p>
          ) : visible.length === 0 ? (
            <p className="text-[hsl(var(--landing-navy)/0.6)]">No packages available yet.</p>
          ) : (
            <PackageCarousel key={category} packages={visible} onOpen={setOpenPkg} />
          )}
        </div>
        <PackageDetailsDialog
          pkg={openPkg}
          selectedItem={openPkg ? selected.find((p) => p.id === openPkg.id) : undefined}
          onToggle={onToggle}
          onSetExtras={onSetExtras}
          onClose={() => setOpenPkg(null)}
        />
      </div>

      {selected.length > 0 && (
        <button
          onClick={onRequest}
          className="fixed bottom-24 md:bottom-8 right-6 z-40 h-12 px-6 rounded-full shadow-xl bg-[hsl(var(--landing-gold))] text-[hsl(var(--landing-navy))] font-semibold hover:opacity-90 transition-opacity"
        >
          Request a quote ({selected.length})
        </button>
      )}
    </section>
  );
}