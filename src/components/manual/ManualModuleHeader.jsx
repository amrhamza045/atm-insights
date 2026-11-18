import { Calendar, MapPin, Link2 } from "lucide-react";
import { FINANCE_STATUS } from "@/components/manual/financeStatus";

// Title block of a manual chapter: breadcrumb, where to find it, Finance link
// status and the related modules (click to open them).
export default function ManualModuleHeader({ section, t, language, onOpenModule }) {
  const status = FINANCE_STATUS[section.finance_status];
  const crumbs = [section.domain || section.category, section.chapter].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        {section.chapter_code && <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-xs font-semibold">{section.chapter_code}</span>}
        <span>{crumbs.join(" › ")}</span>
        {status && <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.badge}`}>{status[language] || status.en}</span>}
      </div>
      <h1 className="text-3xl font-bold text-slate-900">{section.module_name}</h1>
      {section.nav_path && (
        <p className="flex items-start gap-1.5 text-sm text-slate-600">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
          <span><span className="font-medium">{t?.whereToFind || "Where to find it"}:</span> {section.nav_path}</span>
        </p>
      )}
      {section.linked_modules?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link2 className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">{t?.relatedModules || "Related modules"}:</span>
          {section.linked_modules.map((name) => (
            <button key={name} onClick={() => onOpenModule(name)} className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-xs text-slate-700 hover:border-blue-400 hover:text-blue-700">
              {name}
            </button>
          ))}
        </div>
      )}
      {section.last_updated && (
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {t?.lastUpdated || "Last updated"}: {new Date(section.last_updated).toLocaleString()}
        </p>
      )}
    </div>
  );
}