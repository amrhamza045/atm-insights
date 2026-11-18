import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useIsAdmin } from "@/components/permissions/PermissionsContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import PermissionSyncLogTable from "@/components/admin/permissionCopy/PermissionSyncLogTable";

export default function PermissionCopyCheck() {
  const isAdmin = useIsAdmin();
  const { data, isLoading } = useQuery({
    queryKey: ["permissionCopyReport"],
    queryFn: async () => (await base44.functions.invoke("getPermissionCopyReport", {})).data,
    enabled: isAdmin,
  });

  if (!isAdmin) return <div className="p-8 text-center text-slate-500">Admins only.</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader><CardTitle>Permission copy verification</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Central admin</TableHead>
                <TableHead>Branch</TableHead><TableHead>Permission copy</TableHead><TableHead>Matches now</TableHead><TableHead>Last synced</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(data?.rows || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><div className="font-medium">{r.name || "—"}</div><div className="text-xs text-slate-500">{r.email}</div></TableCell>
                    <TableCell>{r.role || "—"}</TableCell>
                    <TableCell>{r.is_central_admin ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-xs">{r.branch_id || "All branches"}</TableCell>
                    <TableCell className="text-xs max-w-xs"><span className="font-medium">{r.granted.length} granted</span>
                      <div className="text-slate-500 break-words">{r.granted.join(", ")}</div></TableCell>
                    <TableCell>{r.matches ? <Badge className="bg-emerald-600">Yes</Badge> :
                      <div><Badge variant="destructive">No</Badge><div className="text-xs text-red-600 mt-1 break-words">{r.diff.join(", ")}</div></div>}</TableCell>
                    <TableCell className="text-xs">{r.synced_at ? new Date(r.synced_at).toLocaleString() : "Never"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <PermissionSyncLogTable />
    </div>
  );
}