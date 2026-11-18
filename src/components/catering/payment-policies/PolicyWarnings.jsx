import React from "react";
import { AlertTriangle } from "lucide-react";

export default function PolicyWarnings({ warnings }) {
  if (!warnings.length) return null;
  return (
    <ul className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 space-y-1">
      {warnings.map((warning) => (
        <li key={warning} className="flex items-start gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
          {warning}
        </li>
      ))}
    </ul>
  );
}