import React from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * A top-bar dropdown built from link items ({ show, to, icon, label }).
 * Hidden when none of its main items show; `extra` items never keep it open
 * on their own; `separated` draws a line above an item.
 */
export default function NavDropdown({ label, icon: Icon, items }) {
  const visible = items.filter((i) => i.show);
  if (!visible.some((i) => !i.extra)) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2.5">
          <Icon className="w-4 h-4" />
          <span className="hidden lg:inline text-xs sm:text-sm">{label}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs text-slate-500">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {visible.map((item) => (
          <React.Fragment key={item.to}>
            {item.separated && <DropdownMenuSeparator />}
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to={item.to} className="flex items-center gap-2">
                <item.icon className={`w-4 h-4 ${item.iconClass || "text-slate-500"}`} />
                <span className={`text-sm ${item.textClass || ""}`}>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}