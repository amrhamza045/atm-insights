import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Home } from "lucide-react";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { homePageLabel, isHomePage, roleCanOpen } from "@/lib/homePages";
import HomePagePickerDialog from "./HomePagePickerDialog";

// The screen this role opens at "/": after signing in and from the Home links.
export default function HomePageField({ role, onChange }) {
  const [open, setOpen] = useState(false);
  const { disabledModules } = useModuleAccess();
  const current = role.home_page || "";
  const unavailable = !!current && (!isHomePage(current) || !roleCanOpen(role, current, disabledModules));

  return (
    <div>
      <Label>Home Page</Label>
      <div className="flex flex-wrap items-center gap-3 mt-1">
        <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-2">
          <Home className="w-4 h-4" />
          {current ? homePageLabel(current) : "Website home page"}
        </Button>
        <p className="text-xs text-slate-500">Opens after signing in and from the Home links.</p>
      </div>
      {unavailable && (
        <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          This role can't open {homePageLabel(current)}, so its users get the website home page.
        </p>
      )}
      <HomePagePickerDialog
        open={open}
        onOpenChange={setOpen}
        role={role}
        globalClosed={disabledModules}
        onPick={(page) => { onChange(page); setOpen(false); }}
      />
    </div>
  );
}