import { isSafetyValveUser } from "@/components/permissions/platformRoleRule";

/** App-level administrator recognition — the central platform-role rule, via the resolved permissions. */
export default function isAdminUser(currentUser, permissions) {
  if (!currentUser) return false;
  return isSafetyValveUser(currentUser) || permissions?.platform_role === "admin";
}