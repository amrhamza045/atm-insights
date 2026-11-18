import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

// A clickable, keyboard-accessible column heading. First click sorts
// ascending, the next click on the same column flips to descending.
export default function SortHeader({ label, column, sort, onSort, align = "right" }) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  const next = () => onSort({ key: column, dir: active && sort.dir === "asc" ? "desc" : "asc" });
  return (
    <th className={`px-3 py-3 ${align === "left" ? "text-left" : "text-right"}`} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={next}
        className={`inline-flex items-center gap-1 rounded uppercase tracking-wide transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${active ? "text-slate-900" : ""}`}>
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? "" : "opacity-40"}`} />
      </button>
    </th>
  );
}