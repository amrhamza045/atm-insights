import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Shield, User, Mail, UserX, Lock } from "lucide-react";
import { useRoleLabels } from "./useRoleOptions";

export default function UserIdentityHeader({ user, displayName, isCurrentUser, isAdmin, assignedRole, isExEmployee }) {
  const labels = useRoleLabels();

  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0 border border-slate-200">
          {isAdmin ? <Shield className="w-6 h-6 text-amber-600" /> : <User className="w-6 h-6 text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">{displayName || user.full_name || "Unnamed User"}</h3>
            {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
            {isExEmployee && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                <UserX className="w-3 h-3 mr-1" />
                Ex Employee
              </Badge>
            )}
          </div>
          <p className="flex items-center gap-1 text-sm text-slate-500 mt-1 break-all">
            <Mail className="w-3 h-3 flex-shrink-0" />
            {user.email}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Label className="text-xs text-slate-600">Assigned Role</Label>
        <div className="mt-1 flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-slate-700">
          <Lock className="w-3 h-3 text-slate-400" />
          {assignedRole ? labels[assignedRole] || assignedRole : "No role"}
        </div>
        <p className="text-xs text-slate-500 mt-1">Roles are assigned from the HR module</p>
      </div>
    </div>
  );
}