import { ALL_PERMISSION_KEYS } from "@/components/permissions/permissionKeys";

/**
 * Turns an admin's edited permission view into a SPARSE override map: only the
 * keys where their toggle differs from the role's current live value are stored.
 * Everything else keeps following the role, so future role edits reach this user.
 */
export function computePermissionOverrides(edited = {}, roleRecord = null) {
  const rolePermissions = roleRecord?.permissions || {};
  const overrides = {};
  ALL_PERMISSION_KEYS.forEach((key) => {
    const wanted = edited[key] === true;
    if (wanted !== (rolePermissions[key] === true)) overrides[key] = wanted;
  });
  return overrides;
}

/** Same idea for a role's closed list (modules or tabs): only per-user deviations are stored. */
function computeListOverrides(editedClosed = [], roleClosed = []) {
  const roleSet = new Set(roleClosed || []);
  const userSet = new Set(editedClosed || []);
  const overrides = {};
  userSet.forEach((key) => {
    if (!roleSet.has(key)) overrides[key] = false; // closed beyond the role
  });
  roleSet.forEach((key) => {
    if (!userSet.has(key)) overrides[key] = true; // open despite the role
  });
  return overrides;
}

export const computeModuleOverrides = (editedDisabled = [], roleRecord = null) =>
  computeListOverrides(editedDisabled, roleRecord?.disabled_modules);

export const computeTabOverrides = (editedClosed = [], roleRecord = null) =>
  computeListOverrides(editedClosed, roleRecord?.disabled_tabs);