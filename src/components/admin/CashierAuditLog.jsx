import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { Search, ShieldAlert, Trash2, RotateCcw, CreditCard, Plus, X, LogIn, LogOut, PoundSterling, AlertTriangle } from "lucide-react";

const ACTION_ICONS = {
  order_deleted: Trash2,
  order_payment_changed: CreditCard,
  return_added: RotateCcw,
  return_deleted: RotateCcw,
  session_opened: LogIn,
  session_closed: LogOut,
  order_cancelled: X,
  expense_added: PoundSterling,
  purchase_added: Plus,
  deposit_added: Plus,
};

const ACTION_COLORS = {
  order_deleted: "bg-red-100 text-red-700 border-red-200",
  order_payment_changed: "bg-blue-100 text-blue-700 border-blue-200",
  return_added: "bg-orange-100 text-orange-700 border-orange-200",
  return_deleted: "bg-yellow-100 text-yellow-700 border-yellow-200",
  session_opened: "bg-green-100 text-green-700 border-green-200",
  session_closed: "bg-slate-100 text-slate-700 border-slate-200",
  order_cancelled: "bg-red-100 text-red-700 border-red-200",
  expense_added: "bg-purple-100 text-purple-700 border-purple-200",
  purchase_added: "bg-amber-100 text-amber-700 border-amber-200",
  deposit_added: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export default function CashierAuditLog({ sessionId = null }) {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["cashierAuditLogs", sessionId],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.filter({ entity_type: "CashierSession" }, "-created_date", 500);
      // Also get order-level cashier audit logs
      const orderLogs = await base44.entities.AuditLog.filter({ entity_type: "CashierOrder" }, "-created_date", 500);
      const combined = [...logs, ...orderLogs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      if (sessionId) {
        return combined.filter(l => l.entity_id === sessionId || l.changes?.session_id === sessionId);
      }
      return combined;
    },
    refetchInterval: 10000
  });

  const filtered = auditLogs.filter(log => {
    const matchSearch = !search || 
      log.action_description?.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || log.action_type === filterAction;
    return matchSearch && matchAction;
  });

  const actionTypes = [...new Set(auditLogs.map(l => l.action_type))].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by action, user, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map(a => (
              <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="pt-6 text-center text-slate-500">Loading audit logs...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No audit entries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const Icon = ACTION_ICONS[log.action_type] || AlertTriangle;
            const colorClass = ACTION_COLORS[log.action_type] || "bg-slate-100 text-slate-700 border-slate-200";
            return (
              <Card key={log.id} className="border-l-4 border-l-slate-300">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg border ${colorClass} flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={`text-xs border ${colorClass}`}>
                            {log.action_type?.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          <span className="text-xs text-slate-500">{log.admin_email}</span>
                          {log.status === "failed" && (
                            <Badge className="bg-red-100 text-red-700 text-xs">FAILED</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800">{log.action_description}</p>
                        {log.entity_name && (
                          <p className="text-xs text-slate-500 mt-0.5">Entity: {log.entity_name}</p>
                        )}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="mt-2 bg-slate-50 rounded p-2 text-xs space-y-1">
                            {Object.entries(log.changes).map(([key, val]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium text-slate-600">{key.replace(/_/g, ' ')}:</span>
                                {typeof val === 'object' && val !== null && 'before' in val ? (
                                  <span>
                                    <span className="line-through text-red-500">{String(val.before)}</span>
                                    <span className="mx-1">→</span>
                                    <span className="text-green-600">{String(val.after)}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-700">{String(val)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-500">
                        {new Date(log.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}