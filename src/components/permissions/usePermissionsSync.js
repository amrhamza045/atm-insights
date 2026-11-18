import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Keeps a live session's resolved permissions fresh.
 *
 * The app's query client has refetchOnWindowFocus disabled, so without this a
 * user whose role is changed by an admin keeps their old permissions until a
 * full reload or re-login. Here we listen for UserPermissions writes and
 * invalidate ["userPermissions", email] when the change concerns this user.
 *
 * Deliberately failure-tolerant: this sits in the auth-critical path, so any
 * subscription problem must leave the app exactly as it behaves today rather
 * than throwing. Never awaited, never surfaced to the user.
 */
export function usePermissionsSync(email) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!email) return;

    const target = String(email).toLowerCase().trim();
    let unsubscribe = null;
    let unsubscribeRoles = null;

    // Role definitions are read live, so a role edit must reach every open
    // session immediately — not on the next 15s freshness pass.
    try {
      unsubscribeRoles = base44.entities.Role.subscribe(() => {
        try {
          queryClient.refetchQueries({ queryKey: ["rolesCatalog"], exact: true, type: "active" });
          queryClient.invalidateQueries({ queryKey: ["roles"] });
        } catch {
          // a malformed event must never break the session
        }
      });
    } catch {
      // realtime unavailable for Role — the freshness poll still covers it
    }

    try {
      unsubscribe = base44.entities.UserPermissions.subscribe((event) => {
        try {
          const rowEmail = String(event?.data?.user_email || "").toLowerCase().trim();
          if (rowEmail !== target) return;
          const queryKey = ["userPermissions", email];
          queryClient.setQueryData(["allUserPermissions"], current => {
            if (!current) return current;
            if (event?.type === "delete") return current.filter(row => row.id !== event.id);
            return current.map(row => row.id === event.id ? { ...row, ...(event.data || {}) } : row);
          });
          if (event?.type === "delete") {
            queryClient.removeQueries({ queryKey, exact: true });
          } else {
            // Apply the event immediately. Refetch-only handling can race the
            // database read and put the old row back into cache.
            queryClient.setQueryData(queryKey, current => ({ ...(current || {}), ...(event.data || {}) }));
          }
          queryClient.refetchQueries({ queryKey, exact: true, type: "active" });
          // A role change can also flip User.role (admin <-> non-admin), which
          // is read from auth.me() — re-resolve it in the same pass.
          queryClient.refetchQueries({ queryKey: ["currentUser"], exact: true, type: "active" });
        } catch {
          // a malformed event must never break the session
        }
      });
    } catch {
      // realtime unavailable — fall back to today's behaviour (refresh/re-login)
      return;
    }

    return () => {
      try {
        if (typeof unsubscribeRoles === "function") unsubscribeRoles();
        if (typeof unsubscribe === "function") unsubscribe();
      } catch {
        // ignore teardown failures
      }
    };
  }, [email, queryClient]);
}