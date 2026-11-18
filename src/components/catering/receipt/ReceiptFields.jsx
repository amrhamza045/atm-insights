import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={!!checked} onCheckedChange={onChange} />
    </div>
  );
}

/** English and Arabic versions of one text, side by side; the Arabic box reads right to left. */
export function BilingualText({ label, field, value, set, rows = 0, hint }) {
  const Box = rows ? Textarea : Input;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="grid md:grid-cols-2 gap-3">
        {["en", "ar"].map((lang) => (
          <div key={lang} className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{lang === "en" ? "English" : "Arabic"}</p>
            <Box
              dir={lang === "ar" ? "rtl" : "ltr"}
              rows={rows || undefined}
              value={value[`${field}_${lang}`] || ""}
              onChange={(e) => set(`${field}_${lang}`, e.target.value)}
            />
          </div>
        ))}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}