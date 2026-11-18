import { base44 } from "@/api/base44Client";

const slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Find a catalog role by label or key; create it with the live Staff role's permissions if missing. */
export async function ensureCatalogRole(name, roles) {
  const key = slug(name);
  const existing = roles.find((r) => r.role_key === key || (r.role_label || "").toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing;
  const [staff] = await base44.entities.Role.filter({ role_key: "staff" });
  return base44.entities.Role.create({
    role_key: key,
    role_label: name.trim(),
    permissions: staff?.permissions || {},
    disabled_modules: staff?.disabled_modules || [],
    disabled_tabs: staff?.disabled_tabs || [],
    is_system: false,
    is_active: true,
    sort_order: roles.length,
  });
}

/** Delete a role if no user holds it; also unlinks it from every department. */
export async function deleteCatalogRole(role) {
  const users = await base44.entities.UserPermissions.filter({ role: role.role_key });
  if (users.length) throw new Error(`${users.length} user(s) still have this role — reassign them first.`);
  const depts = await base44.entities.Department.filter({ user_roles: role.role_key });
  await Promise.all(depts.map((d) => base44.entities.Department.update(d.id, {
    user_roles: (d.user_roles || []).filter((k) => k !== role.role_key),
    positions: (d.positions || []).filter((p) => p !== role.role_label),
  })));
  await base44.entities.Role.delete(role.id);
}