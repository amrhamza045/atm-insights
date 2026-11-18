import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, Edit2, Image, Lock, ExternalLink, UtensilsCrossed, Wine } from "lucide-react";
import SectionEditor from "./SectionEditor";
import ManualProgressBar from "./ManualProgressBar";

const STATUS_ICON = {
  approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  pending_approval: <Clock className="w-4 h-4 text-warning-500" />,
  needs_revision: <AlertCircle className="w-4 h-4 text-red-500" />,
  draft: <Clock className="w-4 h-4 text-slate-400" />,
};

const STATION_ICON = {
  kitchen: <UtensilsCrossed className="w-3.5 h-3.5" />,
  bar: <Wine className="w-3.5 h-3.5" />,
};

const STATION_COLOR = {
  kitchen: "bg-amber-50 text-amber-600",
  bar: "bg-purple-50 text-purple-600",
};

export default function RecipeSectionCard({ menuItem, entry, onSaved, isAdmin, lang = "en", allEntries = [] }) {
  const [open, setOpen] = useState(false);
  const isAr = lang === "ar";
  const status = entry?.status || "not_started";
  const station = menuItem.preparation_station || "kitchen";
  const hasImages = (entry?.dine_in_images?.length || 0) + (entry?.delivery_images?.length || 0) > 0;
  const isApproved = entry?.status === "approved";
  const isLocked = !isApproved;

  // Per-item progress: recipe card has multiple completion aspects
  const itemProgress = (() => {
    if (!entry) return { pct: 0, completed: 0, total: 4 };
    let completed = 0;
    const total = 4;
    if (entry.content_en && Object.keys(entry.content_en).length > 0) completed++;
    if (entry.content_ar && Object.keys(entry.content_ar).length > 0) completed++;
    if (entry.dine_in_images?.length > 0) completed++;
    if (entry.delivery_images?.length > 0) completed++;
    return { pct: Math.round((completed / total) * 100), completed, total };
  })();

  const section = {
    key: `recipe_${station}_${menuItem.id}`,
    number: station === "bar" ? "5.3" : "4.5",
    title_en: menuItem.name,
    title_ar: menuItem.name_ar || menuItem.name,
    type: station === "bar" ? "recipe_beverage" : "recipe_food",
    main_category: station,
    item_category: menuItem.category || menuItem.category_name,
    menu_item_id: menuItem.id,
    menu_item_name: menuItem.name,
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${isLocked ? "border-warning-200" : "border-slate-200"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        {menuItem.image_url ? (
          <img src={menuItem.image_url} alt={menuItem.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Image className="w-5 h-5 text-slate-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm truncate">{menuItem.name}</span>
            {menuItem.name_ar && <span className="text-xs text-slate-500 font-normal" dir="rtl">{menuItem.name_ar}</span>}
            {isLocked && <Lock className="w-3 h-3 text-warning-500" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 ${STATION_COLOR[station]}`}>
              {STATION_ICON[station]}
              {station}
            </span>
            <span className="text-xs text-slate-400">{menuItem.category || menuItem.category_name}</span>
            {menuItem.price && <span className="text-xs text-slate-400">· {menuItem.price} EGP</span>}
            {hasImages && (
              <span className="text-xs text-blue-500 flex items-center gap-0.5">
                <Image className="w-3 h-3" />
                {(entry?.dine_in_images?.length || 0) + (entry?.delivery_images?.length || 0)}
              </span>
            )}
          </div>
        </div>
        {/* Per-item progress mini bar */}
        <div className="flex-shrink-0 w-16">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${itemProgress.pct}%`,
                background: itemProgress.pct === 100 ? "#16a34a" : itemProgress.pct >= 50 ? "#d97706" : "#7c3030"
              }}
            />
          </div>
          <span className="text-[10px] text-slate-400 text-center block mt-0.5">{itemProgress.pct}%</span>
        </div>
        <div className="flex-shrink-0">{STATUS_ICON[status] || STATUS_ICON.draft}</div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 bg-white">
          {/* Per-item completion breakdown */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600">{isAr ? "اكتمال بطاقة الوصفة" : "Recipe Card Completion"}</span>
              <span className="text-xs font-bold" style={{ color: itemProgress.pct === 100 ? "#16a34a" : "#7c3030" }}>
                {itemProgress.completed}/{itemProgress.total} ({itemProgress.pct}%)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <CompletionBadge label={isAr ? "محتوى إنجليزي" : "EN Content"} done={!!(entry?.content_en && Object.keys(entry.content_en).length > 0)} />
              <CompletionBadge label={isAr ? "محتوى عربي" : "AR Content"} done={!!(entry?.content_ar && Object.keys(entry.content_ar).length > 0)} />
              <CompletionBadge label={isAr ? "صور مطعم" : "Dine-In Photos"} done={!!(entry?.dine_in_images?.length > 0)} />
              <CompletionBadge label={isAr ? "صور توصيل" : "Delivery Photos"} done={!!(entry?.delivery_images?.length > 0)} />
            </div>
            {isLocked && (
              <p className="text-xs text-warning-600 mt-2 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {isAr
                  ? "هذا الصنف مقفل في نقطة البيع والموقع حتى اكتمال 100%"
                  : "This item is locked in POS & Website until 100% complete"}
              </p>
            )}
          </div>

          <SectionEditor
            section={section}
            entry={entry}
            onSaved={onSaved}
            isAdmin={isAdmin}
            lang={lang}
          />
        </div>
      )}
    </div>
  );
}

function CompletionBadge({ label, done }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded ${done ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-400"}`}>
      {done ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      <span className="truncate">{label}</span>
    </div>
  );
}