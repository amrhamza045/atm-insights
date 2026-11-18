import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { Search, ShieldAlert, Trash2, CreditCard, RotateCcw, AlertTriangle, Edit, PlusCircle, XCircle, User, FileText } from "lucide-react";

const CHANGE_ICONS = {
  payment_method_changed: CreditCard,
  status_changed: Edit,
  order_deleted: Trash2,
  order_cancelled: XCircle,
  order_created: PlusCircle,
  item_added: PlusCircle,
  item_removed: XCircle,
  quantity_increased: Edit,
  quantity_decreased: Edit,
  order_modified: Edit,
  customer_changed: User,
  notes_changed: FileText,
  discount_applied: CreditCard,
};

const CHANGE_COLORS = {
  payment_method_changed: "bg-blue-100 text-blue-700 border-blue-200",
  status_changed: "bg-amber-100 text-amber-700 border-amber-200",
  order_deleted: "bg-red-100 text-red-700 border-red-200",
  order_cancelled: "bg-red-100 text-red-700 border-red-200",
  order_created: "bg-green-100 text-green-700 border-green-200",
  item_added: "bg-green-100 text-green-700 border-green-200",
  item_removed: "bg-orange-100 text-orange-700 border-orange-200",
  quantity_increased: "bg-teal-100 text-teal-700 border-teal-200",
  quantity_decreased: "bg-orange-100 text-orange-700 border-orange-200",
  order_modified: "bg-purple-100 text-purple-700 border-purple-200",
  customer_changed: "bg-slate-100 text-slate-700 border-slate-200",
  notes_changed: "bg-slate-100 text-slate-700 border-slate-200",
  discount_applied: "bg-pink-100 text-pink-700 border-pink-200",
};

const BORDER_COLORS = {
  payment_method_changed: "border-l-blue-400",
  status_changed: "border-l-amber-400",
  order_deleted: "border-l-red-500",
  order_cancelled: "border-l-red-400",
  order_created: "border-l-green-400",
  item_added: "border-l-green-400",
  item_removed: "border-l-orange-400",
  quantity_increased: "border-l-teal-400",
  quantity_decreased: "border-l-orange-400",
  order_modified: "border-l-purple-400",
};

export default function OrderAuditLogViewer({ sessionId = null }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["orderChangeLogs", sessionId],
    queryFn: async () => {
      if (sessionId) {
        return base44.entities.OrderChangeLog.filter({ session_id: sessionId }, "-created_date", 500);
      }
      return base44.entities.OrderChangeLog.list("-created_date", 1000);
    },
    refetchInterval: 15000
  });

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.order_reference?.toLowerCase().includes(search.toLowerCase()) ||
      log.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.cashier_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.cashier_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.previous_value?.toLowerCase().includes(search.toLowerCase()) ||
      log.new_value?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || log.change_type === filterType;
    return matchSearch && matchType;
  });

  const changeTypes = [...new Set(logs.map(l => l.change_type))].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-800">
          <span className="font-semibold">Super Admin Only</span> — Complete audit trail of all order modifications. Tracks payment method changes, status updates, deletions, and item modifications.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by order, customer, cashier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Changes</SelectItem>
            {changeTypes.map(t => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-slate-500">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"} found</p>

      {isLoading ? (
        <Card><CardContent className="pt-6 text-center text-slate-500">Loading order audit trail...</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-8 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">No order changes recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const Icon = CHANGE_ICONS[log.change_type] || AlertTriangle;
            const colorClass = CHANGE_COLORS[log.change_type] || "bg-slate-100 text-slate-700 border-slate-200";
            const borderColor = BORDER_COLORS[log.change_type] || "border-l-slate-300";
            return (
              <Card key={log.id} className={`border-l-4 ${borderColor}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-1.5 rounded-lg border ${colorClass} flex-shrink-0 mt-0.5`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={`text-xs border ${colorClass}`}>
                            {log.change_type?.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          {log.order_reference && (
                            <span className="text-xs font-mono font-semibold text-blue-700">{log.order_reference}</span>
                          )}
                          {log.customer_name && (
                            <span className="text-xs text-slate-600">{log.customer_name}</span>
                          )}
                          {log.order_total != null && (
                            <span className="text-xs font-semibold text-slate-700">{formatCurrency(log.order_total)}</span>
                          )}
                        </div>

                        {/* Before/After for value changes */}
                        {log.previous_value && log.new_value && (
                          <div className="flex items-center gap-2 text-sm my-1">
                            <span className="text-red-500 line-through bg-red-50 px-1.5 py-0.5 rounded text-xs">{log.previous_value}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded text-xs">{log.new_value}</span>
                          </div>
                        )}

                        {/* Item changes */}
                        {log.item_name && (
                          <p className="text-xs text-slate-700 mt-0.5">
                            Item: <span className="font-medium">{log.item_name}</span>
                            {log.previous_quantity != null && log.new_quantity != null && (
                              <span> — qty: <span className="line-through text-red-500">{log.previous_quantity}</span> → <span className="text-green-600 font-semibold">{log.new_quantity}</span></span>
                            )}
                          </p>
                        )}

                        {/* Details */}
                        {log.details && (
                          <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>
                        )}

                        {/* Cashier & table info */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {log.cashier_name && (
                            <span className="text-xs text-slate-500">By: <span className="font-medium text-slate-700">{log.cashier_name}</span></span>
                          )}
                          {log.table_number && (
                            <span className="text-xs text-slate-500">Table: <span className="font-medium">{log.table_number}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-slate-400">{new Date(log.created_date).toLocaleString()}</p>
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