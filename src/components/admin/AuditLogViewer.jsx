import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Activity, 
  Search, 
  Download,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

const actionTypeColors = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  approve: "bg-emerald-100 text-emerald-800",
  reject: "bg-orange-100 text-orange-800",
  export: "bg-purple-100 text-purple-800"
};

const entityTypeIcons = {
  Reward: "🎁",
  Payout: "💰",
  SystemSettings: "⚙️",
  Client: "👤",
  LoyaltyTier: "🏆",
  CashbackTier: "💳",
  User: "👥",
  PayoutSettings: "💸"
};

export default function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 1000)
  });

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        log.admin_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action_description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = filterAction === "all" || log.action_type === filterAction;
      const matchesEntity = filterEntity === "all" || log.entity_type === filterEntity;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [auditLogs, searchQuery, filterAction, filterEntity]);

  const paginatedLogs = useMemo(() => {
    const start = page * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page]);

  const handleExport = () => {
    const csv = [
      ["Timestamp", "Admin Email", "Action", "Entity Type", "Entity Name", "Description", "Status"],
      ...filteredLogs.map(log => [
        format(new Date(log.created_date), "yyyy-MM-dd HH:mm:ss"),
        log.admin_email,
        log.action_type,
        log.entity_type,
        log.entity_name || "-",
        log.action_description,
        log.status
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    a.click();
  };

  const uniqueActions = [...new Set(auditLogs.map(log => log.action_type))];
  const uniqueEntities = [...new Set(auditLogs.map(log => log.entity_type))];
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  if (isLoading) {
    return <div className="text-center py-8">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Audit Log
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Track all administrator actions and changes to the system
          </p>
        </CardHeader>
      </Card>

      {/* Filters */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search admin, entity, action..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-10 bg-white"
          />
        </div>

        <Select value={filterAction} onValueChange={(value) => {
          setFilterAction(value);
          setPage(0);
        }}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterEntity} onValueChange={(value) => {
          setFilterEntity(value);
          setPage(0);
        }}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {uniqueEntities.map(entity => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-slate-900">Timestamp</TableHead>
                <TableHead className="font-semibold text-slate-900">Admin</TableHead>
                <TableHead className="font-semibold text-slate-900">Action</TableHead>
                <TableHead className="font-semibold text-slate-900">Entity</TableHead>
                <TableHead className="font-semibold text-slate-900">Description</TableHead>
                <TableHead className="font-semibold text-slate-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50">
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {format(new Date(log.created_date), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-900">
                      {log.admin_email}
                    </TableCell>
                    <TableCell>
                      <Badge className={actionTypeColors[log.action_type] || "bg-slate-100 text-slate-800"}>
                        {log.action_type.charAt(0).toUpperCase() + log.action_type.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-900">
                      <span className="mr-1">{entityTypeIcons[log.entity_type] || "📋"}</span>
                      {log.entity_type}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                      {log.action_description}
                    </TableCell>
                    <TableCell>
                      {log.status === "success" ? (
                        <div className="flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-700">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Failed</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filteredLogs.length)} of {filteredLogs.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-slate-600">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}