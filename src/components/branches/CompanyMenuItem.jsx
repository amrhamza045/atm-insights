import React from "react";
import { Check } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

// Company row in the branch picker: picks every branch of the company at once.
export default function CompanyMenuItem({ company, count, selected, onSelect }) {
  return (
    <DropdownMenuItem
      onClick={() => onSelect(company.id)}
      className="flex items-center justify-between gap-2 cursor-pointer"
    >
      <div className="flex flex-col min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <span data-no-translate className="truncate">{company.name}</span>
          {company.company_code && (
            <span data-no-translate className="text-[11px] font-normal text-slate-400 flex-shrink-0">{company.company_code}</span>
          )}
        </span>
        <span className="text-xs text-slate-500">
          All branches ({count}){company.is_active ? "" : " · Inactive"}
        </span>
      </div>
      {selected && <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />}
    </DropdownMenuItem>
  );
}