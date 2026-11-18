import { ArrowLeft, ArrowRight } from "lucide-react";
import RecentLocationsMenu from "@/components/layout/RecentLocationsMenu";
import { navButtonClass } from "@/components/layout/navButtonClass";

const NavButton = ({ label, disabled, onClick, children }) => (
  <button type="button" onClick={onClick} disabled={disabled} className={`${navButtonClass} w-8`} title={label} aria-label={label}>
    {children}
  </button>
);

// Back / Forward / Recent locations, as in File Explorer.
export default function HistoryButtons({ history, index, onBack, onForward, onJump }) {
  return (
    <div className="flex items-center gap-[5px] flex-shrink-0">
      <NavButton label="Back" disabled={index <= 0} onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
      </NavButton>
      <NavButton label="Forward" disabled={index >= history.length - 1} onClick={onForward}>
        <ArrowRight className="w-4 h-4" />
      </NavButton>
      <RecentLocationsMenu history={history} index={index} onJump={onJump} />
    </div>
  );
}