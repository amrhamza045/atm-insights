import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { syncCateringPurchaseOrder } from "./procurement";

/**
 * Accepting a catering shortfall PO used to be possible only from the Purchases
 * module, so staff raising a shortfall order had no way to approve it. This is
 * the same approval action (all lines approved -> status "pending", or all
 * rejected -> cancelled) surfaced right under the Shortfall Queue.
 */
export default function CateringPoApprovalQueue() {
  const queryClient = useQueryClient();
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  const canApprove = isAdmin || permissions?.purchase_approve || permissions?.purchases_approve;
  const [busy, setBusy] = React.useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["catering-pos-awaiting-approval"],
    queryFn: async () => {
      const all = await base44.entities.PurchaseOrder.filter({ order_source: "catering" }, "-created_date", 200);
      return all.filter((o) => ["pending_approval", "recommended"].includes(o.status));
    },
  });

  const refresh = (order) => syncCateringPurchaseOrder(order, queryClient);

  const decide = async (order, decision) => {
    setBusy(order.id);
    try {
      const user = await base44.auth.me().catch(() => null);
      const items = (order.items || []).map((i) => ({ ...i, approval_status: decision }));
      await base44.entities.PurchaseOrder.update(order.id, {
        items,
        status: decision === "approved" ? "pending" : "cancelled",
        total_amount: decision === "approved" ? items.reduce((s, i) => s + (Number(i.total_price) || 0), 0) : 0,
        reviewed_by: user?.email || "",
        reviewed_at: new Date().toISOString(),
        ...(decision === "rejected" ? { cancellation_reason: "Rejected from the catering shortfall queue" } : {}),
      });
      await refresh(order);
      toast.success(
        decision === "approved"
          ? `${order.order_number} approved — release slip updated automatically`
          : `${order.order_number} rejected — shortfall reopened and release slip updated`
      );
    } catch {
      toast.error("Could not update this purchase order");
    } finally {
      setBusy(null);
    }
  };

  if (orders.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-slate-400" /> Purchase orders awaiting approval
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Orders raised from shortfalls. Approving one sends it to purchasing to buy and receive; stock only moves when the
          purchase is recorded. Rejecting reopens the shortfall.
        </p>
      </div>

      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="rounded-lg border border-warning-200 bg-warning-50 p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm text-slate-900">{o.order_number}</p>
                <p className="text-xs text-slate-600">
                  {o.supplier || "No supplier"} · {o.items?.length || 0} item(s) · {formatCurrency(o.total_amount)}
                </p>
                <p className="text-xs text-slate-500">
                  {o.catering_event_ids?.length > 1 ? `${o.catering_event_ids.length} events` : o.catering_event_name}
                  {o.needed_by_date ? ` · needed by ${o.needed_by_date}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {o.urgency === "urgent" && <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>}
                <Badge className="bg-warning-100 text-warning-700 text-xs">Awaiting approval</Badge>
              </div>
            </div>

            <div className="space-y-1">
              {(o.items || []).map((i, idx) => (
                <p key={idx} className="text-xs text-slate-600">
                  {i.inventory_item_name} — {i.quantity_ordered} {i.purchase_unit_label || i.unit} ·{" "}
                  {formatCurrency(i.total_price)}
                </p>
              ))}
            </div>

            {canApprove ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={busy === o.id}
                  onClick={() => decide(o, "approved")}
                >
                  <CheckCircle className="w-3 h-3" /> Approve order
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-red-600"
                  disabled={busy === o.id}
                  onClick={() => decide(o, "rejected")}
                >
                  <XCircle className="w-3 h-3" /> Reject
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Waiting for someone with purchase approval rights.</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}