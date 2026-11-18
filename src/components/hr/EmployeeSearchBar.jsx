import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Always-visible search over the employees list (name, ID, position, department, role, contact, branch, hire date, salary). */
export default function EmployeeSearchBar({ value, onChange }) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, ID, phone, email, position, department…"
        className="pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 text-slate-500"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}