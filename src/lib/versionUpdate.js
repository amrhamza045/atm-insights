import { clearCacheAndReload } from "@/lib/clearCache";

/**
 * Coordinates silent version updates with the POS "active check" state.
 *
 * - useVersionCheck (in App.jsx) calls triggerUpdateIfSafe() when a new
 *   deployment is detected.
 * - If the POS reports it's busy (active check), the update is deferred
 *   via a pending flag.
 * - The POS registers a busy-checker function and calls flushPendingUpdate()
 *   when it transitions to idle — triggering the update silently.
 */

let posBusyChecker = null;
let pendingUpdate = false;

/**
 * Registers a function that returns true when the POS has an active check
 * (items in cart, items sent to kitchen, split-check dialog open, or payment
 * completion in progress).
 */
export function registerPosBusyChecker(fn) {
  posBusyChecker = fn;
}

export function unregisterPosBusyChecker() {
  posBusyChecker = null;
}

export function isPosBusy() {
  return typeof posBusyChecker === "function" ? posBusyChecker() : false;
}

/**
 * Called by useVersionCheck when a new version is detected.
 * If the POS is idle (or not mounted), reloads immediately and silently.
 * If the POS is busy, marks a pending update that will fire when the POS goes idle.
 */
export function triggerUpdateIfSafe() {
  if (isPosBusy()) {
    pendingUpdate = true;
    return;
  }
  clearCacheAndReload();
}

/**
 * Called by the POS when it transitions to an idle state (no active check).
 * If a pending update was registered, fires it now — silently, no prompt.
 */
export function flushPendingUpdate() {
  if (pendingUpdate) {
    pendingUpdate = false;
    clearCacheAndReload();
  }
}