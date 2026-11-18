import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, UserCheck, User, AlertCircle } from "lucide-react";
import UserListRow from "./UserListRow";
import { TYPE_OPTIONS } from "./userLabels";
import { useRoleOptions } from "./useRoleOptions";

export default function UserListPanel({
  users,
  getDisplayName,
  isLoading,
  loadError,
  totalUserCount = 0,
  currentUserEmail,
  selectedEmail,
  onSelect,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  typeFilter,
  setTypeFilter,
  getUserRole,
  getPlatformRole,
  isEmployee,
  isExEmployee,
  getPreviousRole
}) {
  // Role filter options come live from the Role catalog, so custom roles appear
  // automatically. "User" covers accounts with no staff role at all.
  const { roleOptions } = useRoleOptions();
  const roleFilterOptions = [
    { value: "all", label: "All Roles" },
    { value: "user", label: "User" },
    ...roleOptions
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          Users
        </CardTitle>
        <CardDescription>Select a user to manage their access</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger>
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            {roleFilterOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <UserCheck className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-10">
            <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
            <p className="text-sm font-medium text-red-700">Couldn't load users</p>
            <p className="text-xs text-red-600 mt-1">
              This account may not be allowed to view the user list. Only app administrators can manage users.
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10">
            <User className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              {totalUserCount > 0 ? "No users match these filters" : "No users found"}
            </p>
            {totalUserCount > 0 && (
              <p className="text-xs text-slate-500 mt-1">Try clearing the search or filters above.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[32rem] overflow-y-auto">
            {users.map(user => (
              <UserListRow
                key={user.id}
                user={user}
                displayName={getDisplayName?.(user)}
                isSelected={selectedEmail === user.email}
                isCurrentUser={user.email === currentUserEmail}
                role={getUserRole(user)}
                isAdmin={getPlatformRole?.(user) === "admin"}
                isEmployee={isEmployee(user)}
                isExEmployee={isExEmployee(user)}
                previousRole={getPreviousRole(user)}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}