import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { homePageGroups } from "@/lib/homePages";
import HomePageOption from "./HomePageOption";

// Lists only the pages this role can open (its permissions and modules, plus
// app-wide closures), grouped like the top bar.
export default function HomePagePickerDialog({ open, onOpenChange, role, globalClosed, onPick }) {
  const current = role.home_page || "";
  const groups = homePageGroups(role, globalClosed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Home page · {role.role_label}</DialogTitle>
          <DialogDescription>
            Only pages this role can open are listed. Your choice is saved with Save Changes.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-3 -mx-1 px-1">
          <HomePageOption label="Website home page (default)" selected={!current} onClick={() => onPick("")} />
          {groups.map(([group, pages]) => (
            <div key={group}>
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{group}</p>
              {pages.map((p) => (
                <HomePageOption key={p.value} label={p.label} selected={current === p.value} onClick={() => onPick(p.value)} />
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}