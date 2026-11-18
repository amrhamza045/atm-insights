import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { triggerUpdateIfSafe } from "@/lib/versionUpdate";

function getCurrentScriptSrc() {
  const script = document.querySelector('script[type="module"]');
  if (!script) return null;
  return script.getAttribute("src");
}

async function fetchRemoteScriptSrc() {
  try {
    const response = await fetch(`/index.html?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Detects when a new deployment has occurred by comparing the currently-loaded
 * module script src against a fresh fetch of index.html.
 *
 * Behavior:
 * - Non-POS pages or POS with no active check: silently forces a full cache-clear
 *   and reload immediately — no toast, no prompt.
 * - POS with an active check (items in cart, items sent to kitchen, split-check
 *   dialog open, or payment in progress): defers the update. The POS triggers it
 *   automatically the moment the check is closed and the POS returns to idle.
 *
 * Checks on initial load (delayed), every route change, and window focus.
 */
export function useVersionCheck() {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const checkVersion = async () => {
      const currentSrc = getCurrentScriptSrc();
      const remoteSrc = await fetchRemoteScriptSrc();
      if (!currentSrc || !remoteSrc) return;

      const normalize = (src) => src.replace(/^\/+/, "").split("?")[0];
      if (normalize(currentSrc) !== normalize(remoteSrc)) {
        triggerUpdateIfSafe();
      }
    };

    // Delay initial check to avoid blocking page render
    const timer = setTimeout(checkVersion, 3000);

    // Re-check when the window regains focus (cashier returns to the tab)
    const onFocus = () => checkVersion();
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [location.pathname]);
}