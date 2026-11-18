import React from "react";
import { Store, Package, Star } from "lucide-react";
import StatusBadge from "./StatusBadge";
import RowActions from "./RowActions";

export default function BranchRow({ branch, storage, busy, onEdit, onToggle, onDelete }) {
  const active = branch.is_active !== false;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Store className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-800 truncate">{branch.name}</span>
          {branch.branch_code && <span className="text-xs text-slate-400">{branch.branch_code}</span>}
          <StatusBadge active={active} />
          {branch.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" aria-label="Default branch" />}
        </div>
        <RowActions active={active} busy={busy} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      </div>
      {storage.length > 0 && (
        <div className="ml-6 mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {storage.map((s) => (
            <span key={s.id} className="flex items-center gap-1 text-xs text-slate-500"><Package className="w-3 h-3" />{s.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}