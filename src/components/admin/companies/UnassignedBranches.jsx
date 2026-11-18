import React from "react";
import { Card } from "@/components/ui/card";
import BranchRow from "./BranchRow";

export default function UnassignedBranches({ branches, storage, busy, branchHandlers }) {
  if (!branches.length) return null;
  return (
    <Card className="p-5 border border-dashed border-amber-300 shadow-none space-y-2">
      <div>
        <h3 className="font-semibold text-slate-900">Branches without a company</h3>
        <p className="text-xs text-slate-500">Edit a branch to choose the company it belongs to.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {branches.map((b) => (
          <BranchRow key={b.id} branch={b} storage={storage.filter((s) => s.branch_id === b.id)} busy={busy}
            onEdit={() => branchHandlers.edit(b, "")} onToggle={() => branchHandlers.toggle(b)} onDelete={() => branchHandlers.remove(b)} />
        ))}
      </div>
    </Card>
  );
}