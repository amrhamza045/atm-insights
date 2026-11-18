import { useSyncExternalStore } from "react";

// File-Explorer style navigation, kept for this session (a reload starts fresh).
// - history: every location opened, in order ({ url, label }). Back / Forward
//   move through it without changing it; opening anything new drops the
//   forward entries.
// - path: what the CURRENT page reported is inside it (tabs, records), keyed
//   by its url so a path is never shown for another location.
const MAX_HISTORY = 50;
let state = { history: [], index: -1, path: null };
let pendingIndex = null; // history entry a Back / Forward / Recent jump is opening
const listeners = new Set();

const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

// Called on every address change (PUSH, REPLACE or the browser's POP).
export function recordLocation(url, navType, label) {
  const { history, index } = state;
  const pending = pendingIndex;
  pendingIndex = null;
  if (pending !== null && history[pending]?.url === url) return set({ index: pending });
  if (history[index]?.url === url) return;
  // The browser's own back / forward (or a long-press jump): nearest matching entry.
  if (navType === "POP") {
    for (let d = 1; d < history.length; d++) {
      if (history[index - d]?.url === url) return set({ index: index - d });
      if (history[index + d]?.url === url) return set({ index: index + d });
    }
  }
  const entry = { url, label };
  // A redirect replaces where you are instead of adding a step.
  if (navType === "REPLACE" && index >= 0) {
    return set({ history: history.map((h, i) => (i === index ? entry : h)) });
  }
  const next = [...history.slice(0, index + 1), entry].slice(-MAX_HISTORY);
  set({ history: next, index: next.length - 1 });
}

// Back (-1) / Forward (+1): returns the URL to open.
export const travel = (delta) => travelTo(state.index + delta);

// Recent locations: jump to any history entry; returns the URL to open.
export function travelTo(i) {
  const target = state.history[i];
  if (!target || i === state.index) return null;
  pendingIndex = i;
  return target.url;
}

// Pages report what is inside them: [{ label, url, children? }], starting with the page.
export function setPath(url, segments) {
  set({ path: { url, segments } });
}

// The path bar names each history entry after its full path (for Recent locations).
export function labelLocation(url, label) {
  if (!state.history.some((h) => h.url === url && h.label !== label)) return;
  set({ history: state.history.map((h) => (h.url === url ? { ...h, label } : h)) });
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const usePathTrail = () => useSyncExternalStore(subscribe, () => state);