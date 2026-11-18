import { Check } from "lucide-react";

export default function HomePageOption({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
        selected ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="w-4 h-4 flex-shrink-0" />}
    </button>
  );
}