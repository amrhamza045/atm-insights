import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Languages, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getNumeralStyle, setNumeralStyle } from "@/components/i18n/numeralPreference";

const OPTIONS = [
  { value: "english", label: "English numerals", sample: "1,234.56" },
  { value: "arabic", label: "Arabic numerals", sample: "١,٢٣٤.٥٦" },
];

export default function LanguagePreferenceSettings() {
  const [choice, setChoice] = useState(getNumeralStyle());
  const [saving, setSaving] = useState(false);

  const handleApply = async () => {
    setSaving(true);
    try {
      const rows = await base44.entities.SystemSettings.list();
      if (rows?.[0]) await base44.entities.SystemSettings.update(rows[0].id, { numeral_style: choice });
      else await base44.entities.SystemSettings.create({ setting_key: "global", numeral_style: choice });
      setNumeralStyle(choice);
      toast.success("Numeral style applied across the app");
    } catch {
      toast.error("Failed to apply numeral style");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Languages className="w-4 h-4" />
          Number Display
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setChoice(o.value)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                choice === o.value ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-slate-900">{o.label}</span>
                {choice === o.value && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p data-no-numerals className="text-lg mt-1 text-slate-600">{o.sample}</p>
            </button>
          ))}
        </div>
        <Button onClick={handleApply} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Apply
        </Button>
      </CardContent>
    </Card>
  );
}