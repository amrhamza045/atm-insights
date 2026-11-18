import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import UsersWorkspace from "@/components/admin/users/UsersWorkspace";

export default function UsersTabContent({ tabs = [] }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Users & Permissions</h2>
          <p className="text-sm text-slate-500">
            Select a user to manage their module access and granular permissions. Roles are assigned from the HR module.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/PermissionCopyCheck">
            <ShieldCheck className="w-4 h-4" />
            Verify permission copies
          </Link>
        </Button>
      </div>

      <UsersWorkspace tabs={tabs} />
    </div>
  );
}