import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Zap, Settings2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { daysUntil } from "./cateringLogic";
import {
  getProcurementSettings,
  saveProcurementSettings,
  buildShortfallLines,
  buildHorizonLines,
  isWithinPlanningHorizon,
  syncEventProcurement,
} from "./procurement";
import CateringPOTriggerDialog from "./CateringPOTriggerDialog";

const PO_STATUS = {
  pending_approval: { label: "Awaiting approval", cls: "bg-warning-100 text-warning-700" },
  pending: { label: "Approved — pending", cls: "bg-warning-100 text-warning-700" },
  confirmed: { label: "Confirmed", cls: "bg-blue-100 text-blue-700" },
  shipped: { label: "Shipped", cls: "bg-blue-100 text-blue-700" },
  delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};

export default function ProcurementPanel({ event, reservations }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: settings } = useQuery({ queryKey: ["catering-procurement-settings"], queryFn: getProcurementSettings });

  const { data: orders = [] } = useQuery({
    queryKey: ["catering-pos", event.id],
    queryFn: () => base44.entities.PurchaseOrder.filter({ catering_event_id: event.id }, "-created_date"),
  });

  // Keep the event honest: PO cancellations / item changes flow back onto the plan
  useEffect(() => {
    if (!orders.length) return;
    syncEventProcurement(event).then(() => {
      queryClient.invalidateQueries({ queryKey: ["catering-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["catering-events"] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.map((o) => `${o.id}:${o.status}`).join(",")]);

  const shortfallLines = buildShortfallLines(reservations);
  const horizonOk = settings ? isWithinPlanningHorizon(event, settings) : false;
  const days = daysUntil(event.event_date);

  const refresh = async () => {
    await syncEventProcurement(event);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-pos"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-reservations"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
    ]);
  };

  const updateSetting = async (field, value) => {
    await saveProcurementSettings(settings, { [field]: Number(value) || 0 });
    queryClient.invalidateQueries({ queryKey: ["catering-procurement-settings"] });
    toast.success("Procurement lead times updated");
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-slate-400" /> Procurement
          <Badge variant="outline" className="text-xs font-normal">{days} day(s) to event</Badge>
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowSettings((s) => !s)} className="gap-1">
            <Settings2 className="w-4 h-4" /> Lead times
          </Button>
          <Button size="sm" variant="outline" onClick={refresh} className="gap-1">
            <RefreshCw className="w-4 h-4" /> Sync
          </Button>
        </div>
      </div>

      {showSettings && settings && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg">
          <div>
            <Label className="text-xs">Planning horizon (days)</Label>
            <Input type="number" min="0" className="h-8" defaultValue={settings.planning_horizon_days}
              onBlur={(e) => updateSetting("planning_horizon_days", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Urgent threshold (days)</Label>
            <Input type="number" min="0" className="h-8" defaultValue={settings.urgent_threshold_days}
              onBlur={(e) => updateSetting("urgent_threshold_days", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Delivery buffer (days)</Label>
            <Input type="number" min="0" className="h-8" defaultValue={settings.default_delivery_buffer_days}
              onBlur={(e) => updateSetting("default_delivery_buffer_days", e.target.value)} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!settings || !horizonOk || reservations.length === 0}
          onClick={() => setDialog({ trigger: "planning_horizon", lines: buildHorizonLines(reservations) })}
        >
          <ShoppingCart className="w-4 h-4" /> Plan-ahead / bulk order
        </Button>
      </div>
      {settings && !horizonOk && (
        <p className="text-xs text-slate-500">
          Plan-ahead ordering opens for events at least {settings.planning_horizon_days} days out — this one is {days} day(s) away.
        </p>
      )}

      <div className="space-y-2">
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">No purchase orders raised for this event yet.</p>
        ) : (
          orders.map((o) => {
            const st = PO_STATUS[o.status] || PO_STATUS.pending_approval;
            return (
              <div key={o.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{o.order_number}</p>
                    <p className="text-xs text-slate-500">
                      {o.supplier} · {o.items?.length || 0} item(s) · {formatCurrency(o.total_amount)}
                      {o.expected_delivery_date ? ` · due ${o.expected_delivery_date}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`${st.cls} text-xs`}>{st.label}</Badge>
                    {o.urgency === "urgent" && o.status !== "cancelled" && (
                      <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {o.catering_trigger === "planning_horizon" ? "Plan-ahead" : "Shortfall"}
                    </Badge>
                  </div>
                </div>
                {o.status === "cancelled" && (
                  <p className="text-xs text-red-600 mt-1.5">
                    Cancelled — the shortfall it covered is open again and needs re-ordering.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {dialog && settings && (
        <CateringPOTriggerDialog
          open
          onClose={() => setDialog(null)}
          event={event}
          trigger={dialog.trigger}
          lines={dialog.lines}
          settings={settings}
          onDone={refresh}
        />
      )}
    </Card>
  );
}