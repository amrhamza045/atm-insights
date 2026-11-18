import React from "react";
import { ShieldAlert } from "lucide-react";
import ManufacturingManagement from "@/components/admin/ManufacturingManagement";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";

export default function Manufacturing() {
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  // Recipes define what gets produced (the narrower right) → manufacturing_edit.
  // Running batches is the day-to-day view → manufacturing_view.
  const canAccessRecipes = isAdmin || !!permissions?.manufacturing_edit;
  const canAccessBatches = isAdmin || !!(permissions?.manufacturing_view || permissions?.manufacturing_edit);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {(!canAccessRecipes && !canAccessBatches) ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Access Restricted</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            You don't have permission to access the Manufacturing module.
          </p>
        </div>
      ) : (
        <ManufacturingManagement
          canAccessRecipes={canAccessRecipes}
          canAccessBatches={canAccessBatches}
        />
      )}
    </div>
  );
}