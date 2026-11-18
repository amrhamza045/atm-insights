import { useModuleAccess } from "@/hooks/useModuleAccess";

// Sub-tab switches (Admin › Modules) for one screen.
// isOpen(key) · keep(tabs): only the open tabs · pick(active, keys): `active`
// when it is offered and open, else the first open key (undefined when none).
export default function useScreenTabs(screen) {
  const { isTabOpen } = useModuleAccess();
  const isOpen = (key) => isTabOpen(screen, key);
  return {
    isOpen,
    keep: (tabs, keyOf = (t) => t.key) => tabs.filter((t) => isOpen(keyOf(t))),
    pick: (active, keys) => (keys.includes(active) && isOpen(active) ? active : keys.find(isOpen)),
  };
}