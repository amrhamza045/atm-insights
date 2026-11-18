import { useState } from "react";
import useScreenTabs from "@/hooks/useScreenTabs";

// State for a tab set listed in screenTabs.js. `value` falls back to the first
// open tab when the chosen one is closed (in Admin › Modules, for the
// account's role or for this user); it is undefined when every tab is closed.
export default function useOpenTab(screen, keys, initial = keys[0]) {
  const { isOpen, pick } = useScreenTabs(screen);
  const [requested, setRequested] = useState(initial);
  return { value: pick(requested, keys), setValue: setRequested, isOpen };
}