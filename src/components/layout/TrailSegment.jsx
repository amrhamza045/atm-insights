import { ChevronRight, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const partClass = (isLast) =>
  `px-[11px] py-2 rounded-lg border text-xs font-semibold leading-[1.2] whitespace-nowrap flex-shrink-0 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a77c39] focus-visible:outline-offset-2 ${
    isLast
      ? "bg-[#a77c39] border-[#a77c39] text-white shadow-[0_2px_5px_rgba(167,124,57,.24)] cursor-default"
      : "bg-white border-[#d9e0e5] text-[#53616b] cursor-pointer hover:bg-[#e8edf0] hover:text-[#25313a] hover:border-[#bfcbd2] active:bg-[#dce4e9]"
  }`;

const short = (label) => (label.length > 22 ? `${label.slice(0, 22)}…` : label);

// Non-modal menus never lock the page, so choosing a place that changes the
// screen can't leave the app unclickable.
function ChildrenMenu({ segment, currentUrl, onOpen, trigger }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] overflow-y-auto">
        {segment.children.map((c) => (
          <DropdownMenuItem key={c.url + c.label} onSelect={() => onOpen(c.url)} className={`text-xs cursor-pointer ${c.url === currentUrl ? "font-semibold text-[#a77c39]" : ""}`}>
            {c.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// One part of the path. Its arrow lists what is inside it (like Explorer's
// folder arrows). A menu group (no address of its own) opens that list itself.
export default function TrailSegment({ segment, isLast, currentUrl, onOpen }) {
  const hasChildren = segment.children?.length > 0;

  if (!segment.url) {
    const label = (
      <button type="button" title={segment.label} disabled={!hasChildren} className={`${partClass(false)} flex items-center gap-1`}>
        {short(segment.label)}
        {hasChildren && <ChevronDown className="w-3 h-3" />}
      </button>
    );
    return (
      <li className="flex items-center gap-[2px] flex-shrink-0">
        {hasChildren ? <ChildrenMenu segment={segment} currentUrl={currentUrl} onOpen={onOpen} trigger={label} /> : label}
        <ChevronRight className="w-3 h-3 flex-none text-[#9aa7af]" />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-[2px] flex-shrink-0">
      <button
        type="button"
        onClick={() => onOpen(segment.url)}
        disabled={isLast}
        aria-current={isLast ? "page" : undefined}
        title={segment.label}
        className={partClass(isLast)}
      >
        {short(segment.label)}
      </button>
      {hasChildren ? (
        <ChildrenMenu
          segment={segment}
          currentUrl={currentUrl}
          onOpen={onOpen}
          trigger={
            <button
              type="button"
              aria-label={`Inside ${segment.label}`}
              title={`Inside ${segment.label}`}
              className="w-5 h-8 flex items-center justify-center rounded-md text-[#9aa7af] hover:bg-[#e8edf0] hover:text-[#25313a] [&[data-state=open]>svg]:rotate-90"
            >
              <ChevronRight className="w-3 h-3 transition-transform" />
            </button>
          }
        />
      ) : !isLast && (
        <ChevronRight className="w-3 h-3 flex-none text-[#9aa7af]" />
      )}
    </li>
  );
}