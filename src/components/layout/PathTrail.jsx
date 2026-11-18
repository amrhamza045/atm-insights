import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { usePathTrail, recordLocation, travel, travelTo, labelLocation } from "@/lib/pathTrail";
import { pageNameOf, routeLabel, buildTrail, trailLabel } from "@/lib/routeHierarchy";
import useRouteAccess from "@/hooks/useRouteAccess";
import HistoryButtons from "@/components/layout/HistoryButtons";
import TrailSegment from "@/components/layout/TrailSegment";

// File-Explorer style navigation bar, shared by every module: Back / Forward /
// Recent, then the path of where you are now (menu group › screen › what
// the screen reports is inside it). Back / Forward follow the order things
// were opened in; the path always describes the current location.
export default function PathTrail() {
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const canOpen = useRouteAccess();
  const { history, index, path } = usePathTrail();
  const url = location.pathname + location.search;
  const page = pageNameOf(location.pathname);

  useEffect(() => {
    recordLocation(url, navType, routeLabel(page));
  }, [location.key]);

  const segments = buildTrail({ page, pathname: location.pathname, reported: path?.url === url ? path.segments : null, canOpen });
  const label = trailLabel(segments);
  useEffect(() => {
    labelLocation(url, label);
  }, [url, label, history.length]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [url, segments.length]);

  const go = (target) => target && navigate(target);
  const open = (target) => target && target !== url && navigate(target);

  return (
    <>
    <div className="bg-slate-50/90 border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-start">
        <nav
          aria-label="Navigation path"
          className={`max-w-full box-border py-1.5 px-1 bg-transparent font-sans transition-opacity duration-300 ${scrolled ? "opacity-80 hover:opacity-100 focus-within:opacity-100" : "opacity-100"}`}
        >
        <div className="flex items-center gap-[5px] min-w-0">
          <HistoryButtons
            history={history}
            index={index}
            onBack={() => go(travel(-1))}
            onForward={() => go(travel(1))}
            onJump={(i) => go(travelTo(i))}
          />
          <ol ref={listRef} className="flex-1 min-w-0 flex items-center gap-[3px] overflow-x-auto scrollbar-hide whitespace-nowrap">
            {segments.map((s, i) => (
              <TrailSegment key={`${s.label}-${i}`} segment={s} isLast={i === segments.length - 1} currentUrl={url} onOpen={open} />
            ))}
          </ol>
        </div>
        </nav>
      </div>
    </div>
    </>
  );
}