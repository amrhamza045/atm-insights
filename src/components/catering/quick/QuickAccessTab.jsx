import { useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import useRouteAccess from "@/hooks/useRouteAccess";
import { useCateringEditAccess } from "../useCateringEditAccess";
import { QUICK_SHORTCUTS } from "./quickAccessShortcuts";
import QuickShortcutButton from "./QuickShortcutButton";
import UpcomingEventsOverview from "./UpcomingEventsOverview";

// One-click shortcuts to the most used Catering screens and the owner's
// dashboards and reports. Only shortcuts this user can open are shown: the
// same tab, role and page rules as everywhere else.
export default function QuickAccessTab({ hasTab, onOpenTab, onNewEvent }) {
  const navigate = useNavigate();
  const canOpen = useRouteAccess();
  const { canEdit } = useCateringEditAccess();
  const allowed = (s) => (s.page ? canOpen(s.page) : hasTab(s.tab) && (!s.newEvent || canEdit));
  const open = (s) => (s.page ? navigate(`/${s.page}${s.query || ""}`) : s.newEvent ? onNewEvent() : onOpenTab(s.tab));
  const shortcuts = QUICK_SHORTCUTS.filter(allowed);

  return (
    <div className="space-y-4">
      <section aria-label="Quick Actions" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {shortcuts.length === 0 ? (
          <p className="text-sm text-slate-500">No shortcuts are available for your role.</p>
        ) : (
          <TooltipProvider delayDuration={300}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {shortcuts.map((s) => <QuickShortcutButton key={s.key} shortcut={s} onClick={() => open(s)} />)}
            </div>
          </TooltipProvider>
        )}
      </section>
      <UpcomingEventsOverview hasTab={hasTab} />
    </div>
  );
}