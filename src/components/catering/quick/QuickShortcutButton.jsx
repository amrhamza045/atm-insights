import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// One Quick Actions shortcut tile with its hint as a tooltip.
export default function QuickShortcutButton({ shortcut, onClick }) {
  const Icon = shortcut.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="group flex flex-1 basis-[9.5rem] items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-amber-300 hover:bg-amber-50 active:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-amber-600 transition-colors group-hover:border-amber-200">
            <Icon className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-medium text-slate-700 group-hover:text-amber-700">{shortcut.label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{shortcut.hint}</TooltipContent>
    </Tooltip>
  );
}