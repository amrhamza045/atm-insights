import React from "react";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { ShieldAlert } from "lucide-react";
import ButcheryManagement from "@/components/butchery/ButcheryManagement";

export default function Butchery() {
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  const allowed = isAdmin || !!(permissions?.butchery_view || permissions?.butchery_edit);
  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-slate-500">You don't have permission to access the Butchery module.</p>
      </div>
    );
  }
  return <ButcheryManagement />;
}