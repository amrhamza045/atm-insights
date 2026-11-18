import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Layer 1 drift self-heal: once per app boot (fresh login, session resume or
 * reopened tab) ask the server to re-sync just this account's permission copy.
 * The server always writes resolver-true values and logs any prior mismatch.
 */
export function useAppOpenSelfSync(currentUser) {
  const done = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUser?.id || done.current) return;
    done.current = true;
    base44.functions
      .invoke("syncPermissionCopy", { trigger: "app_open", user_id: currentUser.id })
      .then(() => queryClient.invalidateQueries({ queryKey: ["currentUser"] }))
      .catch(() => {});
  }, [currentUser?.id, queryClient]);
}