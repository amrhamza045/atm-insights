import React from "react";

const OPTIONS = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

/** Language switcher for the public invitation / attendance pass page. */
export default function PassLanguageToggle({ lang, onChange }) {
  return (
    <div className="flex justify-center gap-1 p-1 rounded-full bg-white border border-[#ece4d4] w-fit mx-auto">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 h-8 rounded-full text-xs font-semibold transition-colors ${
            lang === opt.value ? "bg-[#14452f] text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}