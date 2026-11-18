import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, FileText } from "lucide-react";
import SectionEditor from "./SectionEditor";

const STATUS_ICON = {
  approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  pending_approval: <Clock className="w-4 h-4 text-warning-500" />,
  needs_revision: <AlertCircle className="w-4 h-4 text-red-500" />,
  draft: <Clock className="w-4 h-4 text-slate-300" />,
};

const TYPE_COLORS = {
  general: "bg-blue-50 text-blue-600",
  recipe_food: "bg-orange-50 text-orange-600",
  recipe_beverage: "bg-purple-50 text-purple-600",
  sop: "bg-indigo-50 text-indigo-600",
  checklist: "bg-teal-50 text-teal-600",
  log: "bg-yellow-50 text-yellow-600",
  table: "bg-slate-50 text-slate-600",
  onboarding: "bg-blue-50 text-blue-600",
};

export default function ManualSectionCard({ section, entry, onSaved, isAdmin, lang = "en" }) {
  const [open, setOpen] = useState(false);
  const isAr = lang === "ar";
  const status = entry?.status || "not_started";

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        <div className="w-8 h-8 rounded-lg bg-[#7c3030]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-[#7c3030]">{section.number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">
              {isAr ? section.title_ar : section.title_en}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[section.type] || TYPE_COLORS.general}`}>
              {section.type}
            </span>
          </div>
          {isAr && (
            <span className="text-xs text-slate-400 block mt-0.5">{section.title_en}</span>
          )}
        </div>
        <div className="flex-shrink-0">{STATUS_ICON[status] || STATUS_ICON.draft}</div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 bg-white">
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