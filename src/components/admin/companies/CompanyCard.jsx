import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import StatusBadge from "./StatusBadge";
import RowActions from "./RowActions";
import BranchRow from "./BranchRow";

export default function CompanyCard({ company, branches, storage, busy, onEdit, onToggle, onDelete, onAddBranch, branchHandlers }) {
  return (
    <Card className="p-5 border-0 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-white" /></div>
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-slate-900 truncate">{company.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {company.company_code && <Badge variant="outline" className="text-xs">{company.company_code}</Badge>}
              <StatusBadge active={company.is_active} />
              {company.is_test && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Test</Badge>}
              <span className="text-xs text-slate-500">{branches.length} {branches.length === 1 ? "branch" : "branches"}</span>
            </div>
          </div>
        </div>
        <RowActions active={company.is_active} busy={busy} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
      </div>
      <div className="ml-5 pl-4 border-l border-slate-200 divide-y divide-slate-100">
        {branches.map((b) => (
          <BranchRow key={b.id} branch={b} storage={storage.filter((s) => s.branch_id === b.id)} busy={busy}
            onEdit={() => branchHandlers.edit(b, company.id)} onToggle={() => branchHandlers.toggle(b)} onDelete={() => branchHandlers.remove(b)} />
        ))}
        <div className="pt-3">
          <Button variant="outline" size="sm" onClick={onAddBranch} disabled={busy}><Plus className="w-4 h-4" />Add Branch</Button>
        </div>
      </div>
    </Card>
  );
}