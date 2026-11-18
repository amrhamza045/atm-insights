import { useLocation, useNavigate } from "react-router-dom";
import useTrailPath from "@/lib/useTrailPath";
import { pageNameOf, routeLabel } from "@/lib/routeHierarchy";

// Tabs kept in the address (?tab=…), so Back / Forward, Recent, refresh and
// shared links all land on the same tab — and the path bar shows Page › Tab.
// tabs: [{ key, label }] the user can open. The home tab (fallback, else the
// first) has a clean address.
export default function useTabTrail(tabs, { param = "tab", fallback } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const home = !tabs.length || tabs.some((t) => t.key === fallback) ? fallback : tabs[0].key;
  const requested = new URLSearchParams(location.search).get(param);
  const active = tabs.some((t) => t.key === requested) ? requested : home;

  const urlFor = (key) => {
    const p = new URLSearchParams(location.search);
    if (key === home) p.delete(param); else p.set(param, key);
    const q = p.toString();
    return location.pathname + (q ? `?${q}` : "");
  };

  const current = tabs.find((t) => t.key === active);
  useTrailPath([
    {
      label: routeLabel(pageNameOf(location.pathname)),
      url: location.pathname,
      children: tabs.map((t) => ({ label: t.label, url: urlFor(t.key) })),
    },
    ...(current ? [{ label: current.label, url: urlFor(active) }] : []),
  ]);

  const setActive = (key) => { if (key !== active) navigate(urlFor(key)); };
  return [active, setActive];
}