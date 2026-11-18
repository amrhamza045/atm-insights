import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TRIGGER_LABELS = {
  app_open: "App open (self-heal)",
  action_check: "Server action check (self-heal)",
  sign_in: "Sign-in",
};

export default function PermissionSyncLogTable() {
  const { data: logs = [] } = useQuery({
    queryKey: ["permissionSyncLog"],
    queryFn: () => base44.entities.PermissionSyncLog.list("-created_date", 200),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Sync log (latest 200)</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Trigger</TableHead>
            <TableHead>Result</TableHead><TableHead>Copy differed before</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs">{new Date(l.synced_at || l.created_date).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{l.user_email}</TableCell>
                <TableCell className="text-xs">{l.role || "—"}</TableCell>
                <TableCell className="text-xs">{TRIGGER_LABELS[l.trigger] || l.trigger}</TableCell>
                <TableCell>{l.status === "success" ? <Badge className="bg-emerald-600">Success</Badge> :
                  <div><Badge variant="destructive">Failed ({l.attempts} tries)</Badge><div className="text-xs text-red-600">{l.error_message}</div></div>}</TableCell>
                <TableCell className="text-xs">{l.mismatch_before ? <span className="text-amber-700">Yes: {(l.mismatch_fields || []).join(", ")}</span> : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}