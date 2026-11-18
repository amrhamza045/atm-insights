import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/**
 * Tax / service exemption applied to every line at once, instead of a switch
 * on each row. A toggle is "on" only when all lines are already exempt.
 */
export default function ExemptBulkToggles({ lines = [], onChange }) {
  const allTax = lines.length > 0 && lines.every((l) => !!l.tax_exempt);
  const allSvc = lines.length > 0 && lines.every((l) => !!l.service_exempt);

  const applyAll = (field, value) => onChange(lines.map((l) => ({ ...l, [field]: value })));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <span className="text-xs text-slate-600 mr-1">Apply to all items:</span>
      <Button
        type="button"
        size="sm"
        variant={allTax ? "default" : "outline"}
        className="gap-1.5"
        disabled={lines.length === 0}
        onClick={() => applyAll("tax_exempt", !allTax)}
      >
        {allTax && <Check className="w-3.5 h-3.5" />} Tax exempt
      </Button>
      <Button
        type="button"
        size="sm"
        variant={allSvc ? "default" : "outline"}
        className="gap-1.5"
        disabled={lines.length === 0}
        onClick={() => applyAll("service_exempt", !allSvc)}
      >
        {allSvc && <Check className="w-3.5 h-3.5" />} Service exempt
      </Button>
    </div>
  );
}