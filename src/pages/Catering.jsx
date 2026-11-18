import React from "react";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { ShieldAlert } from "lucide-react";
import CateringManagement from "@/components/catering/CateringManagement";

export default function Catering() {
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  // Single gate for the whole module — the same flag the backend staffing
  // function enforces, so the two can never drift apart.
  const allowed = isAdmin || !!permissions?.catering_view;

  if (!allowed) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-slate-500">You don't have permission to access the Catering module.</p>
      </div>
    );
  }

  return <CateringManagement />;
}