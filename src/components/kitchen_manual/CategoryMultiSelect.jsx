import { Check } from "lucide-react";

/**
 * Multi-select category filter pills.
 * Props:
 *  - categories: string[] of category names
 *  - selected: string[] of selected category names
 *  - onChange: (newSelected: string[]) => void
 *  - lang: "en" | "ar"
 */
export default function CategoryMultiSelect({ categories = [], selected = [], onChange, lang = "en" }) {
  const toggle = (cat) => {
    if (selected.includes(cat)) {
      onChange(selected.filter(c => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  };

  if (categories.length === 0) return null;

  return (
    <div className="flex items-start gap-1.5 flex-wrap">
      <button
        onClick={() => onChange([])}
        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
          selected.length === 0
            ? "bg-[#7c3030] text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        {lang === "ar" ? "الكل" : "All"}
      </button>
      {categories.map(cat => {
        const isSelected = selected.includes(cat);
        const count = categories.length; // just visual
        return (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1 ${
              isSelected
                ? "bg-[#7c3030] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
            {cat}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="text-xs px-2 py-1.5 text-slate-400 hover:text-slate-600"
        >
          {lang === "ar" ? "مسح" : "Clear"}
        </button>
      )}
    </div>
  );
}