import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const OPTIONS = [
  { value: "attending", key: "opt_attending", icon: CheckCircle2, active: "bg-[#14452f] text-white border-[#14452f]" },
  { value: "declined", key: "opt_declined", icon: XCircle, active: "bg-red-600 text-white border-red-600" },
];

/** Three-way RSVP choice the guest picks before submitting their details. */
export default function RsvpChoiceButtons({ value, onChange, t = (k) => k }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-center gap-2 h-12 rounded-xl border text-sm font-semibold transition-colors ${
              selected ? opt.active : "bg-white border-[#ece4d4] text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(opt.key)}
          </button>
        );
      })}
    </div>
  );
}