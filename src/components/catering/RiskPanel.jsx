import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { riskLevel } from "./executionLogic";

const LEVEL = {
  high: { box: "border-red-200 bg-red-50", text: "text-red-800", label: "At risk" },
  medium: { box: "border-warning-200 bg-warning-50", text: "text-warning-800", label: "Needs attention" },
  low: { box: "border-slate-200 bg-slate-50", text: "text-slate-700", label: "Minor notes" },
};

const SEVERITY_STYLES = {
  high: "bg-red-100 text-red-700",
  medium: "bg-warning-100 text-warning-700",
  low: "bg-slate-100 text-slate-600",
};

export default function RiskPanel({ risks }) {
  const level = riskLevel(risks);
  if (level === "none") {
    return (
      <Card className="p-3 border-emerald-200 bg-emerald-50 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <p className="text-sm text-emerald-800">Nothing blocking this event — staffing, procurement and equipment are all clear.</p>
      </Card>
    );
  }
  const style = LEVEL[level];
  return (
    <Card className={`p-3 space-y-2 ${style.box}`}>
      <p className={`text-sm font-semibold flex items-center gap-1.5 ${style.text}`}>
        <AlertTriangle className="w-4 h-4" /> {style.label} — {risks.length} issue(s)
      </p>
      <div className="space-y-1">
        {risks.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <Badge className={`${SEVERITY_STYLES[r.severity]} text-xs`}>{r.area}</Badge>
            <span className={style.text}>{r.detail}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}