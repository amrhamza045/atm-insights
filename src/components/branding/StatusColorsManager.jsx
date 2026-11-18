import React from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getContrastForeground, isValidHex } from "@/lib/colorUtils";
import ColorField from "@/components/branding/ColorField";

function badgeStyle(color) {
  if (!isValidHex(color)) return undefined;
  return { backgroundColor: color, color: `hsl(${getContrastForeground(color)})` };
}

export default function StatusColorsManager({ colors, onChange, advisories }) {
  return (
    <Card className="p-6 border-0 shadow-sm">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-slate-500" />Status Colors</h3>
      <p className="text-sm text-slate-500 mt-0.5">Keep operational meanings separate from the brand palette. Leave blank to use the system default.</p>
      <div className="grid sm:grid-cols-3 gap-4 mt-5">
        <ColorField label="Success" value={colors.success} onChange={(value) => onChange("success", value)} advisory={advisories.success} allowEmpty />
        <ColorField label="Warning" value={colors.warning} onChange={(value) => onChange("warning", value)} advisory={advisories.warning} allowEmpty />
        <ColorField label="Danger" value={colors.danger} onChange={(value) => onChange("danger", value)} advisory={advisories.danger} allowEmpty />
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-medium text-slate-500 mb-3">Status preview</p>
        <div className="flex flex-wrap gap-3">
          <Badge style={badgeStyle(colors.success)} className={!colors.success ? "bg-emerald-500" : ""}>Success</Badge>
          <Badge style={badgeStyle(colors.warning)} className={!colors.warning ? "bg-warning-500" : ""}>Warning</Badge>
          <Badge style={badgeStyle(colors.danger)} className={!colors.danger ? "bg-red-500" : ""}>Danger</Badge>
        </div>
      </div>
    </Card>
  );
}