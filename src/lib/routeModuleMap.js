import { MODULES } from "@/lib/moduleRegistry";

// Route → the module switches that control it, built from each module's
// `routes`. A screen several modules share (HR, Help) stays open while any of
// them is open. A route not listed here is always available.
export const ROUTE_MODULE_MAP = MODULES.reduce((map, m) => {
  (m.routes || []).forEach((route) => {
    map[route] = [...(map[route] || []), m.key];
  });
  return map;
}, {});

export function moduleForRoute(pageName) {
  return ROUTE_MODULE_MAP[pageName];
}