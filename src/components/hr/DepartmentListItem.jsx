import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export default function DepartmentListItem({ department, employeeCount, selected, onSelect }) {
  const roleCount = (department.positions || []).length;
  return (
    <button
      type="button"
      onClick={() => onSelect(department)}
      className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors flex items-center gap-2 ${
        selected ? "bg-teal-50 border-l-4 border-l-teal-600" : "hover:bg-slate-50 border-l-4 border-l-transparent"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 truncate">{department.name}</span>
          {department.is_active === false && (
            <Badge variant="secondary" className="text-xs">inactive</Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {roleCount} role{roleCount === 1 ? "" : "s"} · {employeeCount} employee{employeeCount === 1 ? "" : "s"}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
    </button>
  );
}