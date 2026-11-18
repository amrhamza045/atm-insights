import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Archive, RotateCcw, Video, Image as ImageIcon } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { packageEconomics } from "./packageLogic";
import { packageGaps } from "./packageReadiness";
import { resolvePackageMedia } from "@/components/landing/packageImages";
import DeletePackageButton from "./packages/DeletePackageButton";

export default function PackageCard({ pkg: p, refGuests, onEdit, onToggleRetire }) {
  const ec = packageEconomics(p, refGuests);
  const retired = p.is_active === false;
  const gaps = packageGaps(p);
  const media = resolvePackageMedia(p);

  return (
    <Card className={`overflow-hidden flex flex-col justify-between ${retired ? "opacity-60" : ""}`}>
      <div
        onClick={() => onEdit(p)}
        className="relative aspect-video w-full bg-[#18314b] cursor-pointer group overflow-hidden"
      >
        {media.video ? (
          <video
            src={media.video}
            poster={media.image}
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : media.image ? (
          <img
            src={media.image}
            alt={p.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-white/40">
            <ImageIcon className="w-7 h-7" />
            <span className="text-[11px] uppercase tracking-wider">No media</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
          {media.video && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <Video className="w-3 h-3 text-[#b29a62]" /> Video
            </span>
          )}
          {media.image && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              <ImageIcon className="w-3 h-3 text-emerald-300" /> Photo
            </span>
          )}
          {media.gallery.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              +{media.gallery.length} gallery
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
      <div>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{p.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {p.package_category && <Badge variant="secondary" className="text-xs">{p.package_category}</Badge>}
            <Badge variant="outline" className="text-xs">
              {p.pricing_mode === "per_guest"
                ? `${formatCurrency(p.base_price_per_guest, false)} / guest`
                : p.pricing_mode === "flat"
                ? `Flat ${formatCurrency(p.flat_price, false)}`
                : "Itemized"}
            </Badge>
            <Badge variant="outline" className="text-xs">{(p.line_items || []).length} items</Badge>
            {p.min_guests > 0 && <Badge variant="outline" className="text-xs">Min {p.min_guests} guests</Badge>}
            {retired && <Badge variant="destructive" className="text-xs">Retired</Badge>}
            {!retired && gaps.equipment && (
              <Badge className="text-xs bg-warning-100 text-warning-800">No equipment reqs</Badge>
            )}
            {!retired && gaps.materials && (
              <Badge className="text-xs bg-warning-100 text-warning-800">No material reqs</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(p)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <DeletePackageButton pkg={p} />
          <Button variant="ghost" size="icon" onClick={() => onToggleRetire(p)}>
            {retired ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {p.description && <p className="text-xs text-slate-500 mt-2">{p.description}</p>}

      <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
        <div><p className="text-xs text-slate-500">Price</p><p className="font-medium">{formatCurrency(ec.price, false)}</p></div>
        <div><p className="text-xs text-slate-500">Cost</p><p className="font-medium">{formatCurrency(ec.cost, false)}</p></div>
        <div><p className="text-xs text-slate-500">Profit</p><p className="font-medium">{formatCurrency(ec.profit, false)}</p></div>
        <div><p className="text-xs text-slate-500">Margin</p><p className={`font-medium ${ec.margin_pct < 20 ? "text-warning-600" : "text-emerald-600"}`}>{ec.margin_pct}%</p></div>
      </div>

      <p className="text-xs text-slate-400 mt-2">
        Used on {p.times_used || 0} quote{(p.times_used || 0) === 1 ? "" : "s"}
        {p.last_used_date ? ` · last ${new Date(p.last_used_date).toLocaleDateString()}` : ""}
      </p>
      </div>
      </div>
    </Card>
  );
}