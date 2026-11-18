import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MODULES_QUERY_KEY } from "@/hooks/useModuleAccess";

const POLL_MS = 15_000;

/**
 * Fallback freshness pass for access state.
 *
 * Realtime (usePermissionsSync) is the fast path but it is failure-tolerant and
 * silent: if the socket never connects or drops, a session keeps stale access
 * until a reload. This hook guarantees eventual consistency without realtime by
 * re-resolving access on tab focus and on a slow interval.
 *
 * It refreshes three things, because all three gate what a user can see:
 *  - ["userPermissions", email]  — the resolved permission row
 *  - ["currentUser"]             — User.role (admin <-> non-admin changes)
 *  - MODULES_QUERY_KEY           — SystemSettings.disabled_modules
 */
export function useAccessFreshness(email) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!email) return;

    let refreshing = false;
    const refresh = async () => {
      if (refreshing || document.visibilityState !== "visible") return;
      refreshing = true;
      await Promise.allSettled([
        queryClient.refetchQueries({ queryKey: ["userPermissions", email], exact: true, type: "active" }),
        queryClient.refetchQueries({ queryKey: ["currentUser"], exact: true, type: "active" }),
        queryClient.refetchQueries({ queryKey: MODULES_QUERY_KEY, exact: true, type: "active" }),
        queryClient.refetchQueries({ queryKey: ["rolesCatalog"], exact: true, type: "active" }),
      ]);
      refreshing = false;
    };

    const onFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onFocus);
    const timer = setInterval(refresh, POLL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(timer);
    };
  }, [email, queryClient]);
}