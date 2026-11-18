import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Users, Play } from "lucide-react";
import { resolvePackageMedia } from "@/components/landing/packageImages";

export default function PackageCatalogCard({ pkg, selected, onToggle, chosenExtras = [], onExtrasChange }) {
  const { image, video } = resolvePackageMedia(pkg);
  const priceLabel =
    pkg.pricing_mode === "per_guest"
      ? `${(pkg.base_price_per_guest || 0).toLocaleString()} / guest`
      : pkg.pricing_mode === "flat"
      ? `${(pkg.flat_price || 0).toLocaleString()} total`
      : "Priced per selection";

  return (
    <Card className={`overflow-hidden transition-shadow ${selected ? "ring-2 ring-primary" : "hover:shadow-md"}`}>
      {(video || image) && (
        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
          {video ? (
            <video src={video} poster={image} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={image} alt={pkg.name} className="w-full h-full object-cover" />
          )}
          {video && (
            <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              <Play className="w-3 h-3 fill-current" /> Video
            </span>
          )}
        </div>
      )}
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">{pkg.name}</h3>
            {pkg.package_category && (
              <Badge variant="secondary" className="mt-1">{pkg.package_category}</Badge>
            )}
          </div>
          <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{priceLabel}</span>
        </div>

        {pkg.description && <p className="text-sm text-slate-600">{pkg.description}</p>}

        {Array.isArray(pkg.line_items) && pkg.line_items.length > 0 && (
          <ul className="text-sm text-slate-600 space-y-1">
            {pkg.line_items.slice(0, 6).map((li, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{li.name}</span>
              </li>
            ))}
            {pkg.line_items.length > 6 && (
              <li className="text-xs text-slate-400">+ {pkg.line_items.length - 6} more</li>
            )}
          </ul>
        )}

        {pkg.min_guests > 0 && (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Minimum {pkg.min_guests} guests
          </p>
        )}

        {onExtrasChange && Array.isArray(pkg.extra_items) && pkg.extra_items.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Optional extras</p>
            {pkg.extra_items.map((x) => (
              <label key={x.name} className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  className="mt-0.5"
                  checked={chosenExtras.includes(x.name)}
                  onCheckedChange={(c) => onExtrasChange(c ? [...chosenExtras, x.name] : chosenExtras.filter((n) => n !== x.name))}
                />
                <span className="flex-1 text-sm text-slate-700">
                  {x.name}
                  {x.description && <span className="block text-xs text-slate-500">{x.description}</span>}
                </span>
                {x.price > 0 && (
                  <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                    +{x.price.toLocaleString()}{x.scaling === "per_guest" ? " / guest" : ""}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}

        <Button
          variant={selected ? "default" : "outline"}
          className="w-full"
          onClick={() => onToggle(pkg)}
        >
          {selected ? "Selected" : "Add to request"}
        </Button>
      </CardContent>
    </Card>
  );
}