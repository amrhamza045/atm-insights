import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

/** Per-line tax / service exemption chips for a single quote line. */
export default function LineExemptToggles({ line, onChange }) {
  const chip = (field, label) => {
    const on = !!line[field];
    return (
      <Button
        type="button"
        size="sm"
        variant={on ? "default" : "outline"}
        className="h-7 gap-1 px-2 text-xs"
        onClick={() => onChange({ [field]: !on })}
      >
        {on && <Check className="w-3 h-3" />} {label}
      </Button>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chip("tax_exempt", "Tax exempt")}
      {chip("service_exempt", "Service exempt")}
    </div>
  );
}