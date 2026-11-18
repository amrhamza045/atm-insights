import React from "react";
import { Building2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useBranch } from "@/components/branches/BranchContext";
import BranchMenuGroups from "@/components/branches/BranchMenuGroups";

export default function BranchSelector() {
  const { branches, groups, selectedBranch, selectedBranchId, selectedCompany, selectBranch, selectCompany, isLoading, multiBranch } = useBranch();

  if (!isLoading && !multiBranch) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 animate-pulse">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400 hidden md:inline">Loading...</span>
      </div>
    );
  }

  if (branches.length === 0) return null;

  if (branches.length === 1) {
    return (
      <div className="flex items-center px-2 py-1 rounded-md bg-amber-50 border border-amber-200" title={selectedBranch?.name || branches[0].name}>
        <Building2 className="w-4 h-4 text-amber-600" />
      </div>
    );
  }

  const title = selectedCompany ? `${selectedCompany.name} · All branches` : selectedBranch?.name || "Select Branch";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" title={title} className="gap-1.5 px-2 sm:px-3 border-amber-200 bg-amber-50 hover:bg-amber-100">
          <Building2 className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-900 hidden md:inline max-w-[180px] truncate">
            {selectedCompany ? <><span data-no-translate>{selectedCompany.name}</span> · All branches</> : title}
          </span>
          <ChevronDown className="w-3 h-3 text-amber-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-slate-500">
          {groups.some((g) => g.company) ? "Select company or branch" : "Select Branch"}
        </DropdownMenuLabel>
        <BranchMenuGroups groups={groups} selectedCompany={selectedCompany} selectedBranchId={selectedBranchId} onSelectCompany={selectCompany} onSelectBranch={selectBranch} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}