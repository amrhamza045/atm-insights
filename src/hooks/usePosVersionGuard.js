import { useEffect } from "react";
import { registerPosBusyChecker, unregisterPosBusyChecker, flushPendingUpdate } from "@/lib/versionUpdate";

/**
 * Coordinates silent version updates with the POS "active check" state.
 *
 * "Active check" (busy) = any unsaved work that would be lost on reload:
 *   - items in cart (being built)
 *   - preparedItems sent to kitchen but not yet paid
 *   - split-check dialog open (splits being configured/paid — stays open
 *     until ALL splits are marked paid, so the update never fires mid-split)
 *   - payment completion in progress
 *
 * When a new deployment is detected:
 *   - POS busy → update deferred; auto-fires the moment POS returns to idle
 *   - POS idle or not mounted → update fires immediately
 * No toast, no prompt — fully silent.
 */
export function usePosVersionGuard(cart, preparedItems, splitCheckOpen, completingPaymentForOrder) {
  const isPosBusy =
    cart.length > 0 ||
    preparedItems.length > 0 ||
    splitCheckOpen ||
    !!completingPaymentForOrder;

  // Register/unregister the busy checker so useVersionCheck (in App.jsx)
  // can query whether the POS has an active check before reloading.
  useEffect(() => {
    registerPosBusyChecker(() => isPosBusy);
    return () => unregisterPosBusyChecker();
  }, [isPosBusy]);

  // When the POS transitions from busy → idle, flush any pending update.
  useEffect(() => {
    if (!isPosBusy) {
      flushPendingUpdate();
    }
  }, [isPosBusy]);
}