import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { expandPackageLines, lineEconomics, packageEconomics } from "./packageLogic";
import PackageLineEditor from "./PackageLineEditor";
import PackageEconomicsBar from "./PackageEconomicsBar";

/**
 * Select a saved package (scaled to the event guest count) or build a one-off
 * package that is never saved to the catalog. Returns lines + provenance.
 */
export default function PackagePickerDialog({ open, onOpenChange, guests: eventGuests, onApply }) {
  const [mode, setMode] = useState("catalog");
  const [selectedId, setSelectedId] = useState("");
  const [oneOffName, setOneOffName] = useState("Custom package");
  const [oneOffLines, setOneOffLines] = useState([]);
  // Default on: staff expect to see a price on every line. The package price is
  // split across the items, so the quote total is identical either way.
  const [itemizeHeadline, setItemizeHeadline] = useState(true);
  // Guest count for this selection only — lets one quote mix packages at different pax.
  const [paxInput, setPaxInput] = useState("");
  useEffect(() => { if (open) setPaxInput(String(eventGuests || "")); }, [open, eventGuests]);
  const guests = Number(paxInput) || 0;

  const { data: packages = [] } = useQuery({
    queryKey: ["catering-packages"],
    queryFn: () => base44.entities.CateringPackage.list("-created_date", 200),
    enabled: open,
  });

  const available = packages.filter((p) => p.is_active !== false);
  const selected = available.find((p) => p.id === selectedId);
  const oneOffEconomics = useMemo(
    () => lineEconomics(expandPackageLines({ pricing_mode: "itemized", line_items: oneOffLines }, guests)),
    [oneOffLines, guests]
  );

  const apply = () => {
    if (mode === "catalog") {
      if (!selected) return;
      onApply({
        pax: guests,
        lines: expandPackageLines(selected, guests, { itemizeHeadline }),
        package_id: selected.id,
        package_name: selected.name,
        package_category: selected.package_category || "",
        package_description: selected.description || "",
        package_source: "catalog_package",
        // Once the headline is spread over the lines the quote reads as itemized,
        // so the "prices are 0 by design" notice must not show.
        pricing_mode: itemizeHeadline ? "itemized" : selected.pricing_mode || "itemized",
      });
    } else {
      onApply({
        pax: guests,
        lines: expandPackageLines({ pricing_mode: "itemized", line_items: oneOffLines }, guests),
        package_id: "",
        package_name: oneOffName || "Custom package",
        package_category: "",
        package_source: "one_off_package",
        pricing_mode: "itemized",
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Package — scaled to {guests} guests</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-w-[200px]">
            <Label>Guests (pax) for this package</Label>
            <Input type="number" min="1" value={paxInput} onChange={(e) => setPaxInput(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant={mode === "catalog" ? "default" : "outline"} size="sm" onClick={() => setMode("catalog")}>Saved package</Button>
            <Button variant={mode === "one_off" ? "default" : "outline"} size="sm" onClick={() => setMode("one_off")}>One-off package</Button>
          </div>

          {mode === "catalog" ? (
            <div className="space-y-2">
              {available.length === 0 && <p className="text-sm text-slate-500">No active packages in the catalog yet.</p>}
              {available.map((p) => {
                const ec = packageEconomics(p, guests);
                const belowMin = p.min_guests > 0 && guests < p.min_guests;
                const isSel = selectedId === p.id;
                return (
                  <Card
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`p-3 cursor-pointer transition-colors ${isSel ? "border-slate-900 ring-1 ring-slate-900" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {p.package_category && <Badge variant="secondary" className="text-xs">{p.package_category}</Badge>}
                          <Badge variant="outline" className="text-xs">{(p.line_items || []).length} items</Badge>
                          {belowMin && <Badge variant="destructive" className="text-xs">Below min {p.min_guests} guests</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">{formatCurrency(ec.price, true)}</p>
                        <p className={`text-xs ${ec.margin_pct < 20 ? "text-amber-600" : "text-emerald-600"}`}>
                          {ec.margin_pct}% margin · cost {formatCurrency(ec.cost, false)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {selected && (selected.pricing_mode === "per_guest" || selected.pricing_mode === "flat") && (
                <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={itemizeHeadline}
                    onChange={(e) => setItemizeHeadline(e.target.checked)}
                  />
                  <span className="text-xs text-slate-700">
                    <span className="font-semibold">Show a price on every item</span> — splits the package price across the lines. Untick to bill
                    it as one “package charge” line instead. The quote total stays exactly the same.
                  </span>
                </label>
              )}
              {selected && <PackageEconomicsBar economics={packageEconomics(selected, guests)} guests={guests} label={`${selected.name} at this event`} />}
            </div>
          ) : (
            <div className="space-y-3">
              <div><Label>One-off package label</Label><Input value={oneOffName} onChange={(e) => setOneOffName(e.target.value)} /></div>
              <p className="text-xs text-slate-500">This package is used for this quote only and is not saved to the catalog.</p>
              <PackageLineEditor lines={oneOffLines} onChange={setOneOffLines} />
              <PackageEconomicsBar economics={oneOffEconomics} guests={guests} label="One-off package economics" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply} disabled={guests <= 0 || (mode === "catalog" ? !selected : oneOffLines.length === 0)}>
            Add to quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}