import { base44 } from "@/api/base44Client";

// Records the account permission copy is built from.
export const PERMISSION_SOURCES = ["UserPermissions", "Role", "Employee", "DeliveryPerson", "Client"];

// Call after any bulk tool touched a permission source (bulk writes skip the
// per-record sync triggers). Returns the sync result so callers can report it.
export async function resyncAfterBulk(entityNames) {
  if (!entityNames.some((n) => PERMISSION_SOURCES.includes(n))) return null;
  const res = await base44.functions.invoke("syncPermissionCopy", { trigger: "bulk", all: true });
  return res.data;
}