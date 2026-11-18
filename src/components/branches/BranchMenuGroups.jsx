import React from "react";
import { DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import CompanyMenuItem from "@/components/branches/CompanyMenuItem";
import BranchMenuItem from "@/components/branches/BranchMenuItem";

// Picker body: each company row followed by its branches; unassigned branches last.
export default function BranchMenuGroups({ groups, selectedCompany, selectedBranchId, onSelectCompany, onSelectBranch }) {
  const grouped = groups.some((g) => g.company);
  return groups.map((group) => (
    <React.Fragment key={group.company?.id || "unassigned"}>
      <DropdownMenuSeparator />
      {group.company ? (
        <CompanyMenuItem
          company={group.company}
          count={group.branches.length}
          selected={selectedCompany?.id === group.company.id}
          onSelect={onSelectCompany}
        />
      ) : grouped && (
        <DropdownMenuLabel className="text-xs text-slate-500">Other branches</DropdownMenuLabel>
      )}
      {group.branches.map((branch) => (
        <BranchMenuItem
          key={branch.id}
          branch={branch}
          indent={grouped}
          selected={!selectedCompany && branch.id === selectedBranchId}
          onSelect={onSelectBranch}
        />
      ))}
    </React.Fragment>
  ));
}