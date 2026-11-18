import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { navButtonClass } from "@/components/layout/navButtonClass";

// Explorer's "Recent locations": newest first, the current one ticked.
export default function RecentLocationsMenu({ history, index, onJump }) {
  const items = history.map((h, i) => ({ ...h, i })).reverse().slice(0, 12);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={history.length < 2}>
        <button type="button" className={`${navButtonClass} w-5`} title="Recent locations" aria-label="Recent locations">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-slate-500">Recent locations</DropdownMenuLabel>
        {items.map((h) => (
          <DropdownMenuItem key={h.i} onSelect={() => onJump(h.i)} className={`gap-2 text-xs ${h.i === index ? "font-semibold" : ""}`}>
            <Check className={`w-3.5 h-3.5 flex-shrink-0 ${h.i === index ? "" : "invisible"}`} />
            <span className="truncate" title={h.label}>{h.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}