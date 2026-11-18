import { Badge } from "@/components/ui/badge";
import { User, Shield, Mail, Calendar, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";
import { useRoleLabels } from "./useRoleOptions";

export default function UserListRow({
  user,
  displayName,
  isSelected,
  isCurrentUser,
  role,
  isEmployee,
  isExEmployee,
  previousRole,
  isAdmin = false,
  onSelect
}) {
  const roleLabels = useRoleLabels();

  return (
    <button
      onClick={() => onSelect(user)}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          {isAdmin ? (
            <Shield className="w-4 h-4 text-amber-600" />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 truncate">
              {displayName || user.full_name || "Unnamed User"}
            </p>
            {isCurrentUser && <Badge variant="outline" className="text-xs">You</Badge>}
          </div>
          <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 break-all">
            <Mail className="w-3 h-3 flex-shrink-0" />
            {user.email}
          </p>
          {user.created_date && (
            <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <Calendar className="w-3 h-3" />
              Joined {format(new Date(user.created_date), "MMM d, yyyy")}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Badge
              variant={isAdmin ? "default" : "secondary"}
              className={isAdmin ? "bg-amber-100 text-amber-800" : ""}
            >
              {isAdmin ? "Admin" : roleLabels[role] || "User"}
            </Badge>
            {isExEmployee ? (
              <>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                  <UserX className="w-3 h-3 mr-1" />
                  Ex Employee
                </Badge>
                {previousRole && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                    Previous: {roleLabels[previousRole] || previousRole}
                  </Badge>
                )}
              </>
            ) : isEmployee ? (
              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-xs">
                <UserCheck className="w-3 h-3 mr-1" />
                Employee
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs">
                Regular User
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}