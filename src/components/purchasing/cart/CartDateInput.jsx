import React from "react";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function CartDateInput({ label, value, onChange }) {
  return (
    <div>
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block h-9 pl-2 pr-8 border border-slate-300 rounded text-sm"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}