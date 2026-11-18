import React, { useState } from "react";
import { Check, Users, Plus, Play } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { resolvePackageMedia } from "./packageImages";

const priceLabel = (pkg) =>
  pkg.pricing_mode === "per_guest"
    ? { amount: (pkg.base_price_per_guest || 0).toLocaleString(), unit: "per guest" }
    : pkg.pricing_mode === "flat"
    ? { amount: (pkg.flat_price || 0).toLocaleString(), unit: "total" }
    : { amount: null, unit: "Priced per selection" };

export default function PackageDetailsContent({ pkg, selected, onToggle, chosenExtras, onExtrasChange }) {
  const { image, video, gallery } = resolvePackageMedia(pkg);
  const mediaItems = [
    ...(video ? [{ type: "video", url: video, label: "Video" }] : []),
    ...(image ? [{ type: "image", url: image, label: "Cover" }] : []),
    ...gallery.filter((m) => m.url !== video && m.url !== image),
  ];
  const [activeIdx, setActiveIdx] = useState(0);
  const activeMedia = mediaItems[activeIdx] || mediaItems[0] || null;
  const price = priceLabel(pkg);
  const items = Array.isArray(pkg.line_items) ? pkg.line_items : [];
  const extras = Array.isArray(pkg.extra_items) ? pkg.extra_items : [];

  return (
    <div className="grid md:grid-cols-5 md:h-[600px]">
      <div className="relative md:col-span-2 h-56 md:h-full bg-[hsl(var(--landing-navy))]">
        {activeMedia?.type === "video" ? (
          <video src={activeMedia.url} poster={image} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : activeMedia?.url ? (
          <img src={activeMedia.url} alt={pkg.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        {mediaItems.length > 1 && (
          <div className="absolute top-3 left-3 z-10 flex gap-1.5">
            {mediaItems.slice(0, 5).map((m, idx) => (
              <button
                key={`${m.url}-${idx}`}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`h-8 px-2.5 rounded-full text-xs font-medium backdrop-blur-md transition-colors flex items-center gap-1 ${
                  idx === activeIdx
                    ? "bg-[hsl(var(--landing-gold))] text-[hsl(var(--landing-navy))]"
                    : "bg-black/45 text-white hover:bg-black/65"
                }`}
              >
                {m.type === "video" && <Play className="w-3 h-3 fill-current" />}
                {m.type === "video" ? "Video" : `Photo ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8 text-white">
          {pkg.package_category && (
            <span className="self-start rounded-full bg-[hsl(var(--landing-gold))] text-[hsl(var(--landing-navy))] text-xs font-semibold px-3 py-1">{pkg.package_category}</span>
          )}
          <h3 className="font-heading mt-3 text-3xl md:text-4xl font-medium leading-tight">{pkg.name}</h3>
          <div className="mt-4">
            {price.amount ? (
              <p><span className="text-3xl font-semibold">{price.amount}</span> <span className="text-sm text-white/70">{price.unit}</span></p>
            ) : (
              <p className="text-sm text-white/80">{price.unit}</p>
            )}
            {pkg.min_guests > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80"><Users className="w-4 h-4" /> Minimum {pkg.min_guests} guests</p>
            )}
          </div>
        </div>
      </div>

      <div className="md:col-span-3 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {pkg.description && <p className="text-base leading-relaxed text-slate-600">{pkg.description}</p>}

          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[hsl(var(--landing-gold))] mb-3">What's included</p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {items.map((li, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50"><Check className="w-3 h-3 text-emerald-600" /></span>
                    <span>{li.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extras.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[hsl(var(--landing-gold))] mb-3">Make it yours · optional extras</p>
              <div className="space-y-2">
                {extras.map((x) => {
                  const on = chosenExtras.includes(x.name);
                  return (
                    <label key={x.name} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${on ? "border-[hsl(var(--landing-gold))] bg-[hsl(var(--landing-gold)/0.08)]" : "border-slate-200 hover:border-slate-300"}`}>
                      <Checkbox checked={on} onCheckedChange={(c) => onExtrasChange(c ? [...chosenExtras, x.name] : chosenExtras.filter((n) => n !== x.name))} />
                      <span className="flex-1 text-sm font-medium text-slate-800">
                        {x.name}
                        {x.description && <span className="block text-xs font-normal text-slate-500">{x.description}</span>}
                      </span>
                      {x.price > 0 && <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">+{x.price.toLocaleString()}{x.scaling === "per_guest" ? " / guest" : ""}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-white p-4 md:px-8">
          <button
            onClick={onToggle}
            className={`w-full h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 ${selected ? "bg-emerald-600 text-white" : "bg-[hsl(var(--landing-gold))] text-[hsl(var(--landing-navy))]"}`}
          >
            {selected ? <><Check className="w-5 h-5" /> Added to your request</> : <><Plus className="w-5 h-5" /> Add to request</>}
          </button>
        </div>
      </div>
    </div>
  );
}