import React from "react";
import { Link } from "react-router-dom";
import { Bot, BookOpen, ChevronDown, LifeBuoy, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useModuleAccess } from "@/hooks/useModuleAccess";

// Each item is a Help tab, so it follows that tab's switch and its module
// (AI Assistant, or Module & User Manuals).
const ITEMS = [
  { label: "AI Assistant", tab: "assistant", icon: Bot },
  { label: "Module Manual", tab: "manual", icon: BookOpen },
  { label: "User Manual", tab: "user-manual", icon: Users },
  { label: "Support", tab: "support", icon: LifeBuoy },
];

export default function HelpNavMenu({ mobile = false, active = false }) {
  const { isTabOpen } = useModuleAccess();
  const items = ITEMS.filter((item) => isTabOpen("SupportBot", item.tab));
  if (!items.length) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {mobile ? (
          <button className={`flex flex-col items-center justify-center flex-1 h-16 gap-1 transition-colors ${active ? "text-amber-600" : "text-slate-600 hover:text-slate-900"}`}>
            <MessageCircle className="w-5 h-5" /><span className="text-sm font-medium">Help</span>
          </button>
        ) : (
          <Button variant="ghost" size="sm" className="gap-1.5 px-2.5">
            <MessageCircle className="w-4 h-4" /><span className="hidden lg:inline text-xs sm:text-sm">Help</span><ChevronDown className="w-3 h-3" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs text-slate-500">Help</DropdownMenuLabel><DropdownMenuSeparator />
        {items.map(({ label, tab, icon: Icon }) => (
          <DropdownMenuItem key={tab} asChild className="cursor-pointer">
            <Link to={`/SupportBot?tab=${tab}`} className="flex items-center gap-2"><Icon className="w-4 h-4 text-slate-500" /><span>{label}</span></Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}