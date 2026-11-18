import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { KEEP_TABLES, ACCESS_TABLES, splitWords } from "./cleanupTables";

export default function CleanupTableRow({ row, checked, onToggle, disabled }) {
  const empty = row.count === 0;
  return (
    <label
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
        checked ? "bg-red-50 border-red-200" : "bg-white border-slate-200 hover:bg-slate-50"
      } ${empty ? "opacity-60" : ""}`}
    >
      <Checkbox checked={checked} onCheckedChange={() => onToggle(row.table)} disabled={disabled} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{splitWords(row.table)}</p>
        <div className="flex gap-1 mt-0.5">
          {KEEP_TABLES.has(row.table) && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700">Settings</Badge>}
          {ACCESS_TABLES.has(row.table) && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300 text-purple-700">Access</Badge>}
        </div>
      </div>
      <span className={`text-sm tabular-nums ${row.count == null ? "text-red-500" : "text-slate-600"}`}>
        {row.count == null ? "error" : row.count.toLocaleString()}
      </span>
    </label>
  );
}