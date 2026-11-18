import React from "react";
import { Check } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// One branch row in the branch picker; indented when listed under its company.
export default function BranchMenuItem({ branch, indent, selected, onSelect }) {
  return (
    <DropdownMenuItem
      onClick={() => onSelect(branch.id)}
      className={cn("flex items-center justify-between gap-2 cursor-pointer", indent && "pl-6")}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium">{branch.name}</span>
        {branch.address && (
          <span className="text-xs text-slate-400 truncate max-w-[200px]">{branch.address}</span>
        )}
      </div>
      {selected && <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />}
    </DropdownMenuItem>
  );
}