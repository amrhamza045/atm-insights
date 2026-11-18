import React from "react";
import { Tag, AlertTriangle } from "lucide-react";

export default function SupplierFilterNote({ filtered, noMatch, showAll, onShowAllChange }) {
  return (
    <div className="mt-1 space-y-1">
      {filtered && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Tag className="w-3 h-3" /> Showing suppliers for this category
        </p>
      )}
      {noMatch && (
        <p className="text-xs text-amber-600">No supplier is tagged for this category — showing all.</p>
      )}
      <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
        <input type="checkbox" checked={showAll} onChange={(e) => onShowAllChange(e.target.checked)} />
        Show all suppliers
      </label>
      {showAll && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Category rules are being bypassed
        </p>
      )}
    </div>
  );
}