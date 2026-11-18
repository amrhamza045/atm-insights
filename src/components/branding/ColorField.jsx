import React from "react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidHex } from "@/lib/colorUtils";

export default function ColorField({ label, value, onChange, advisory, allowEmpty = false }) {
  const valid = isValidHex(value);
  const invalid = !valid && !(allowEmpty && !value);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative w-10 h-10 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
          <input type="color" value={valid ? value : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
          <div className="w-full h-full" style={{ backgroundColor: valid ? value : "#e2e8f0" }} />
        </div>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={allowEmpty ? "Default" : "#000000"} className="max-w-[140px] font-mono uppercase" />
      </div>
      {invalid && <p className="text-xs text-red-500">Invalid hex color</p>}
      {advisory && valid && <p className="flex gap-1 text-xs text-warning-700"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{advisory}</p>}
    </div>
  );
}