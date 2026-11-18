import { ShieldAlert } from "lucide-react";
import { platformRoleFor } from "@/components/permissions/platformRoleRule";

// Role editor banner: this role makes everyone holding it a full administrator,
// so its module switches and permissions don't limit them.
export default function AdminRoleNotice({ role }) {
  if (platformRoleFor({ roleKey: role.role_key, roleRecord: role }) !== "admin") return null;
  const source = "Manage users is on";
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-800">
        {source}, so everyone with this role is a full administrator: they get every permission and every module,
        and the module switches and permissions below don't limit them. Only modules closed for everyone in Admin › Modules stay closed.
      </p>
    </div>
  );
}