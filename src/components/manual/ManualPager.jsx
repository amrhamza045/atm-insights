import { ChevronLeft, ChevronRight } from "lucide-react";

// Previous / next chapter buttons at the bottom of a manual module.
export default function ManualPager({ sections, current, onSelect, t }) {
  const index = sections.findIndex((s) => s.id === current.id);
  const prev = index > 0 ? sections[index - 1] : null;
  const next = index >= 0 && index < sections.length - 1 ? sections[index + 1] : null;
  const Card = ({ item, label, align, Icon }) => (
    <button onClick={() => onSelect(item)} className={`flex-1 rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-400 ${align}`}>
      <span className={`flex items-center gap-1 text-xs text-slate-500 ${align === "text-end" ? "justify-end" : ""}`}><Icon className="w-3.5 h-3.5 rtl:rotate-180" />{label}</span>
      <span className="block text-sm font-medium text-slate-800">{item.chapter_code} {item.module_name}</span>
    </button>
  );

  return (
    <div className="flex gap-3 pt-2">
      {prev ? <Card item={prev} label={t?.previous || "Previous"} align="text-start" Icon={ChevronLeft} /> : <div className="flex-1" />}
      {next ? <Card item={next} label={t?.next || "Next"} align="text-end" Icon={ChevronRight} /> : <div className="flex-1" />}
    </div>
  );
}