import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * The Role entity is the single source of truth for the role catalog.
 * Every role dropdown in the app reads from here so custom roles created in
 * Role Management show up everywhere automatically.
 */
export function useRoleOptions() {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list("sort_order")
  });

  const roleOptions = useMemo(
    () =>
      roles
        .filter((r) => r.is_active !== false)
        .map((r) => ({
          value: r.role_key,
          label: r.role_label || r.role_key,
          // Admin-level: only central admins may assign it (server enforces too).
          privileged: r.permissions?.users_manage === true
        })),
    [roles]
  );

  return { roleOptions, isLoading };
}

/** role_key → role_label map, read live from the same catalog. */
export function useRoleLabels() {
  const { roleOptions } = useRoleOptions();
  return useMemo(
    () => Object.fromEntries(roleOptions.map((o) => [o.value, o.label])),
    [roleOptions]
  );
}

export default useRoleOptions;