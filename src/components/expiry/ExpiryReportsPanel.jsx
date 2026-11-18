import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { useBranch } from "@/components/branches/BranchContext";
import ExpiryReportForm from "@/components/expiry/ExpiryReportForm";
import ExpiryReportRow from "@/components/expiry/ExpiryReportRow";
import ResolveExpiryDialog from "@/components/expiry/ResolveExpiryDialog";
import { canEditExpiry, severityFor } from "@/components/expiry/expiryMeta";

export default function ExpiryReportsPanel() {
  const { permissions } = usePermissions();
  const { selectedBranchId, selectedBranch } = useBranch();
  const [resolving, setResolving] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["expiryReports"],
    queryFn: () => base44.entities.ExpiryReport.list("expiry_date", 1000)
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItemsForExpiry"],
    queryFn: () => base44.entities.MenuItem.list("name", 1000)
  });

  const canEdit = canEditExpiry(currentUser, permissions);
  const canView = canEdit || permissions?.inventory_view || permissions?.analytics_view;

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">You don't have access to expiry reports.</p>
        </CardContent>
      </Card>
    );
  }

  const scoped = selectedBranchId
    ? reports.filter((r) => !r.branch_id || r.branch_id === selectedBranchId)
    : reports;
  const open = scoped.filter((r) => r.status === "open");
  const resolved = scoped.filter((r) => r.status !== "open");

  const critical = open.filter((r) => severityFor(r.expiry_date).key === "critical").length;
  const valueAtRisk = open.reduce((s, r) => s + (r.estimated_value || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Raw Material Expiry
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Report raw materials expiring soon and resolve them before they become waste.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-slate-500">Open Reports</p>
          <p className="text-2xl font-bold text-slate-900">{open.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-slate-500">Critical (≤2 days)</p>
          <p className="text-2xl font-bold text-red-600">{critical}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-slate-500">Value at Risk</p>
          <p className="text-2xl font-bold text-slate-900">{valueAtRisk.toFixed(2)} EGP</p>
        </CardContent></Card>
      </div>

      {canEdit && <ExpiryReportForm currentUser={currentUser} branch={selectedBranch} />}

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-2 mt-3">
          {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!isLoading && open.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">No raw materials flagged as expiring.</p>
          )}
          {open.map((r) => (
            <ExpiryReportRow
              key={r.id}
              report={r}
              menuItems={menuItems}
              canEdit={canEdit}
              onResolve={(report, mode) => setResolving({ report, mode })}
            />
          ))}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-2 mt-3">
          {resolved.length === 0 && (
            <p className="text-sm text-slate-400 py-6 text-center">Nothing resolved yet.</p>
          )}
          {resolved.map((r) => (
            <ExpiryReportRow key={r.id} report={r} menuItems={menuItems} canEdit={false} onResolve={() => {}} />
          ))}
        </TabsContent>
      </Tabs>

      {resolving && (
        <ResolveExpiryDialog
          report={resolving.report}
          mode={resolving.mode}
          currentUser={currentUser}
          open={true}
          onClose={() => setResolving(null)}
        />
      )}
    </div>
  );
}