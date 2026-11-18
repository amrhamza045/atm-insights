import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { packageGaps, packagesNeedingRequirements } from "./packageReadiness";

/**
 * Read-only readiness readout: which active packages still have no equipment /
 * material requirements, so their events fall back to manual planning.
 */
export default function PackageReadinessBanner({ packages = [], onFix }) {
  const pending = packagesNeedingRequirements(packages);

  if (packages.length === 0) return null;

  if (pending.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <p className="text-sm text-emerald-900">
          All active packages have their equipment and material requirements set — events auto-reserve on confirmation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-warning-300 bg-warning-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-warning-900">
            {pending.length} active package{pending.length === 1 ? "" : "s"} need requirements
          </p>
          <p className="text-xs text-warning-800 mt-0.5">
            Events quoted from these will not auto-reserve equipment or allocate materials — staff must plan them by hand.
          </p>
          <div className="mt-2 space-y-1.5">
            {pending.map((p) => {
              const g = packageGaps(p);
              const missing = [g.equipment && "equipment", g.materials && "materials"].filter(Boolean).join(" + ");
              return (
                <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-warning-900 min-w-0 truncate">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-warning-700"> — missing {missing}</span>
                  </span>
                  <Button variant="outline" size="sm" className="h-7 shrink-0" onClick={() => onFix(p)}>
                    Fix
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}